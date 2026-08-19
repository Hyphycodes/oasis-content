import Stripe from "stripe";
import { createHash } from "node:crypto";
import { sendTicketConfirmation } from "@/lib/integrations/resend";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secretKey || !webhookSecret || !signature)
    return Response.json(
      { error: "Webhook is not configured." },
      { status: 503 },
    );
  const body = await request.text();
  const stripe = new Stripe(secretKey);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin)
    return Response.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  const payloadSha256 = createHash("sha256").update(body).digest("hex");
  const { error: duplicateError } = await admin
    .from("processed_webhooks")
    .insert({
      provider: "stripe",
      external_event_id: event.id,
      payload_sha256: payloadSha256,
    });
  if (duplicateError?.code === "23505")
    return Response.json({ received: true, duplicate: true });
  if (duplicateError)
    return Response.json(
      { error: "Webhook could not be recorded." },
      { status: 500 },
    );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      const { data: createdCount } = await admin.rpc("fulfill_paid_order", {
        p_order_id: orderId,
        p_payment_intent_id:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : "",
      });
      if (Number(createdCount) > 0) await sendTicketConfirmation(orderId);
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      const { data: items } = await admin
        .from("order_items")
        .select("ticket_type_id,quantity")
        .eq("order_id", orderId);
      for (const item of items ?? [])
        await admin.rpc("release_ticket_inventory", {
          p_ticket_type_id: item.ticket_type_id,
          p_quantity: item.quantity,
        });
      await admin
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId)
        .eq("status", "pending");
    }
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object;
    const paymentIntentId =
      typeof charge.payment_intent === "string" ? charge.payment_intent : null;
    if (paymentIntentId) {
      const { data: order } = await admin
        .from("orders")
        .update({
          status:
            charge.amount_refunded === charge.amount
              ? "refunded"
              : "partially_refunded",
        })
        .eq("stripe_payment_intent_id", paymentIntentId)
        .select("id,event_id")
        .maybeSingle();
      if (order && charge.amount_refunded === charge.amount) {
        const { data: tickets } = await admin
          .from("tickets")
          .select("id,ticket_type_id,status")
          .eq("order_id", order.id);
        const validTickets = (tickets ?? []).filter(
          (ticket) => ticket.status !== "refunded",
        );
        if (validTickets.length) {
          await admin
            .from("tickets")
            .update({ status: "refunded" })
            .in(
              "id",
              validTickets.map((ticket) => ticket.id),
            );
          const counts = new Map<string, number>();
          for (const ticket of validTickets)
            counts.set(
              ticket.ticket_type_id,
              (counts.get(ticket.ticket_type_id) ?? 0) + 1,
            );
          for (const [ticketTypeId, count] of counts) {
            const { data: type } = await admin
              .from("ticket_types")
              .select("sold_count")
              .eq("id", ticketTypeId)
              .single();
            if (type)
              await admin
                .from("ticket_types")
                .update({ sold_count: Math.max(0, type.sold_count - count) })
                .eq("id", ticketTypeId);
          }
          const { data: oasisEvent } = await admin
            .from("events")
            .select("tickets_sold")
            .eq("id", order.event_id)
            .single();
          if (oasisEvent)
            await admin
              .from("events")
              .update({
                tickets_sold: Math.max(
                  0,
                  oasisEvent.tickets_sold - validTickets.length,
                ),
              })
              .eq("id", order.event_id);
        }
      }
    }
  }
  return Response.json({ received: true });
}
