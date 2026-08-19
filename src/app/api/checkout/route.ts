import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { z } from "zod";
import { sendTicketConfirmation } from "@/lib/integrations/resend";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const checkoutInput = z.object({
  slug: z.string().min(2).max(100),
  quantity: z.number().int().min(1).max(10),
  name: z.string().trim().min(2).max(100),
  email: z.email(),
  phone: z.string().trim().max(30).optional(),
  ref: z.string().max(80).optional(),
  ticketTypeId: z.string().max(100).optional(),
});

export async function POST(request: Request) {
  const parsed = checkoutInput.safeParse(await request.json());
  if (!parsed.success)
    return Response.json(
      { error: "Check your ticket and contact details." },
      { status: 400 },
    );
  const input = parsed.data;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const admin = createSupabaseAdminClient();
  if (!admin) {
    if (process.env.NODE_ENV !== "production")
      return Response.json({
        mode: "preview",
        redirectUrl: "/tickets/oasis-demo-order-7K4P9M",
      });
    return Response.json(
      { error: "Ticket checkout is being connected. Please try again soon." },
      { status: 503 },
    );
  }

  const { data: event } = await admin
    .from("events")
    .select(
      "id,title,slug,starts_at,primary_location_id,ticket_types(id,name,description,price_cents,fee_cents,capacity,sold_count,min_per_order,max_per_order,is_hidden,sort_order)",
    )
    .eq("slug", input.slug)
    .eq("status", "published")
    .single();
  const ticketTypes = Array.isArray(event?.ticket_types)
    ? event.ticket_types
        .filter((ticket) => !ticket.is_hidden)
        .sort((a, b) => a.sort_order - b.sort_order)
    : [];
  const ticketType = input.ticketTypeId
    ? ticketTypes.find((ticket) => ticket.id === input.ticketTypeId)
    : ticketTypes[0];
  if (!event || !ticketType)
    return Response.json(
      { error: "Tickets are not available for this event." },
      { status: 404 },
    );
  if (
    input.quantity < ticketType.min_per_order ||
    input.quantity > ticketType.max_per_order
  )
    return Response.json(
      {
        error: `Choose between ${ticketType.min_per_order} and ${ticketType.max_per_order} tickets.`,
      },
      { status: 400 },
    );

  const { error: reserveError } = await admin.rpc("reserve_ticket_inventory", {
    p_ticket_type_id: ticketType.id,
    p_quantity: input.quantity,
  });
  if (reserveError)
    return Response.json(
      { error: "That quantity is no longer available. Try fewer tickets." },
      { status: 409 },
    );

  const [firstName, ...lastNameParts] = input.name.split(/\s+/);
  const email = input.email.toLowerCase();
  const { data: existingCustomer } = await admin
    .from("customers")
    .select("id")
    .ilike("email", email)
    .is("archived_at", null)
    .maybeSingle();
  const customerResult = existingCustomer
    ? await admin
        .from("customers")
        .update({
          phone: input.phone || null,
          first_name: firstName,
          last_name: lastNameParts.join(" ") || null,
        })
        .eq("id", existingCustomer.id)
        .select("id")
        .single()
    : await admin
        .from("customers")
        .insert({
          email,
          phone: input.phone || null,
          first_name: firstName,
          last_name: lastNameParts.join(" ") || null,
          source: "direct",
        })
        .select("id")
        .single();
  const { data: customer, error: customerError } = customerResult;
  if (customerError || !customer) {
    await admin.rpc("release_ticket_inventory", {
      p_ticket_type_id: ticketType.id,
      p_quantity: input.quantity,
    });
    return Response.json(
      { error: "Oasis couldn’t start checkout. Please try again." },
      { status: 500 },
    );
  }

  const subtotal = ticketType.price_cents * input.quantity;
  const feeMode = process.env.OASIS_FEE_MODE ?? "absorbed";
  const percent = Number(process.env.OASIS_SERVICE_FEE_PERCENT ?? 0);
  const serviceFee =
    feeMode === "customer"
      ? Math.round(subtotal * (percent / 100)) +
        ticketType.fee_cents * input.quantity
      : 0;
  const orderId = randomUUID();
  const token = randomUUID().replaceAll("-", "") + randomUUID().slice(0, 8);
  const orderNumber = `OA-${Date.now().toString().slice(-7)}`;
  const { data: promoterLink } = input.ref
    ? await admin
        .from("promoter_links")
        .select("id")
        .eq("code", input.ref)
        .or(`event_id.is.null,event_id.eq.${event.id}`)
        .maybeSingle()
    : { data: null };
  if (promoterLink && !existingCustomer)
    await admin
      .from("customers")
      .update({ source: "promoter" })
      .eq("id", customer.id);
  const { error: orderError } = await admin.from("orders").insert({
    id: orderId,
    order_number: orderNumber,
    secure_order_token: token,
    event_id: event.id,
    customer_id: customer.id,
    promoter_link_id: promoterLink?.id ?? null,
    subtotal_cents: subtotal,
    fee_cents: serviceFee,
    total_cents: subtotal + serviceFee,
    status: "pending",
    idempotency_key: `checkout:${orderId}`,
    metadata: { quantity: input.quantity },
  });
  if (orderError) {
    await admin.rpc("release_ticket_inventory", {
      p_ticket_type_id: ticketType.id,
      p_quantity: input.quantity,
    });
    return Response.json(
      { error: "Oasis couldn’t start checkout. Please try again." },
      { status: 500 },
    );
  }
  const { error: orderItemError } = await admin.from("order_items").insert({
    order_id: orderId,
    ticket_type_id: ticketType.id,
    quantity: input.quantity,
    unit_price_cents: ticketType.price_cents,
    total_cents: subtotal,
  });
  if (orderItemError) {
    await admin.rpc("release_ticket_inventory", {
      p_ticket_type_id: ticketType.id,
      p_quantity: input.quantity,
    });
    await admin
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId);
    return Response.json(
      { error: "Oasis couldn’t prepare those tickets. Please try again." },
      { status: 500 },
    );
  }

  if (subtotal + serviceFee === 0) {
    const { data: createdCount, error: fulfillmentError } = await admin.rpc(
      "fulfill_paid_order",
      {
        p_order_id: orderId,
        p_payment_intent_id: `rsvp:${orderId}`,
      },
    );
    if (fulfillmentError || Number(createdCount) < 1) {
      await admin.rpc("release_ticket_inventory", {
        p_ticket_type_id: ticketType.id,
        p_quantity: input.quantity,
      });
      await admin
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);
      return Response.json(
        { error: "Oasis couldn’t finish this RSVP. Please try again." },
        { status: 500 },
      );
    }
    await sendTicketConfirmation(orderId);
    return Response.json({
      mode: "rsvp",
      redirectUrl: `/tickets/${token}`,
      orderToken: token,
    });
  }

  if (!secretKey) {
    await admin.rpc("release_ticket_inventory", {
      p_ticket_type_id: ticketType.id,
      p_quantity: input.quantity,
    });
    await admin
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId);
    return Response.json(
      {
        error:
          "Secure card checkout is being connected. Please try again soon.",
      },
      { status: 503 },
    );
  }

  const stripe = new Stripe(secretKey);
  try {
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        ui_mode: "embedded",
        customer_email: input.email,
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: ticketType.price_cents,
              product_data: {
                name: `${event.title} — ${ticketType.name}`,
                description: ticketType.description ?? undefined,
              },
            },
            quantity: input.quantity,
          },
          ...(serviceFee
            ? [
                {
                  price_data: {
                    currency: "usd",
                    unit_amount: serviceFee,
                    product_data: { name: "Oasis service fee" },
                  },
                  quantity: 1,
                },
              ]
            : []),
        ],
        return_url: `${origin}/tickets/${token}?session_id={CHECKOUT_SESSION_ID}`,
        metadata: { orderId, orderNumber },
        payment_intent_data: { metadata: { orderId, eventId: event.id } },
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      },
      { idempotencyKey: `checkout:${orderId}` },
    );
    await admin
      .from("orders")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", orderId);
    return Response.json({
      mode: "stripe",
      clientSecret: session.client_secret,
      orderToken: token,
    });
  } catch {
    await admin.rpc("release_ticket_inventory", {
      p_ticket_type_id: ticketType.id,
      p_quantity: input.quantity,
    });
    await admin
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId);
    return Response.json(
      { error: "Secure checkout didn’t start. Your card was not charged." },
      { status: 502 },
    );
  }
}
