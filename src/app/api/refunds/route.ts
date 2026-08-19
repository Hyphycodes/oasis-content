import Stripe from "stripe";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  orderId: z.string().min(3).max(100),
  amountCents: z.number().int().positive().optional(),
  ticketIds: z.array(z.string().uuid()).max(50).optional(),
  reason: z.string().trim().min(3).max(300),
});

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success)
    return Response.json(
      { error: "Choose a valid refund amount and add a short reason." },
      { status: 400 },
    );
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const admin = createSupabaseAdminClient();
  if (!secretKey || !admin) {
    if (process.env.NODE_ENV !== "production")
      return Response.json({
        refund: {
          id: `preview-refund-${Date.now()}`,
          amountCents: parsed.data.amountCents,
          status: "succeeded",
        },
        mode: "preview",
      });
    return Response.json(
      { error: "Refunds are not connected yet." },
      { status: 503 },
    );
  }

  const { data: order } = await admin
    .from("orders")
    .select("id,total_cents,status,stripe_payment_intent_id,event_id")
    .eq("id", parsed.data.orderId)
    .maybeSingle();
  if (
    !order ||
    !["paid", "partially_refunded"].includes(order.status) ||
    !order.stripe_payment_intent_id
  )
    return Response.json(
      { error: "This order is not eligible for a refund." },
      { status: 409 },
    );
  const { data: priorRefunds } = await admin
    .from("refunds")
    .select("amount_cents")
    .eq("order_id", order.id)
    .eq("status", "succeeded");
  const alreadyRefunded = (priorRefunds ?? []).reduce(
    (sum, refund) => sum + refund.amount_cents,
    0,
  );
  const remaining = order.total_cents - alreadyRefunded;
  const amountCents = parsed.data.amountCents ?? remaining;
  if (amountCents > remaining)
    return Response.json(
      { error: "The refund is larger than the remaining paid amount." },
      { status: 400 },
    );
  const serverClient = await createSupabaseServerClient();
  const { data: userData } = serverClient
    ? await serverClient.auth.getUser()
    : { data: { user: null } };
  const { data: refundRow, error: refundRowError } = await admin
    .from("refunds")
    .insert({
      order_id: order.id,
      amount_cents: amountCents,
      reason: parsed.data.reason,
      requested_by: userData.user?.id,
    })
    .select("id")
    .single();
  if (refundRowError || !refundRow)
    return Response.json(
      { error: "The refund could not be started." },
      { status: 500 },
    );

  try {
    const stripe = new Stripe(secretKey);
    const stripeRefund = await stripe.refunds.create(
      {
        payment_intent: order.stripe_payment_intent_id,
        amount: amountCents,
        reason: "requested_by_customer",
        metadata: { oasisRefundId: refundRow.id, oasisOrderId: order.id },
      },
      { idempotencyKey: `oasis-refund:${refundRow.id}` },
    );
    await admin
      .from("refunds")
      .update({ stripe_refund_id: stripeRefund.id, status: "succeeded" })
      .eq("id", refundRow.id);
    const isFullRefund = amountCents === remaining;
    const { data: orderTickets } = await admin
      .from("tickets")
      .select("id,ticket_type_id,status")
      .eq("order_id", order.id);
    const ticketIdSet = new Set(parsed.data.ticketIds ?? []);
    const invalidated = (orderTickets ?? []).filter(
      (ticket) => isFullRefund || ticketIdSet.has(ticket.id),
    );
    const newlyInvalidated = invalidated.filter(
      (ticket) => ticket.status !== "refunded",
    );
    if (newlyInvalidated.length) {
      await admin
        .from("tickets")
        .update({ status: "refunded" })
        .in(
          "id",
          newlyInvalidated.map((ticket) => ticket.id),
        );
      const counts = new Map<string, number>();
      for (const ticket of newlyInvalidated)
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
      const { data: event } = await admin
        .from("events")
        .select("tickets_sold")
        .eq("id", order.event_id)
        .single();
      if (event)
        await admin
          .from("events")
          .update({
            tickets_sold: Math.max(
              0,
              event.tickets_sold - newlyInvalidated.length,
            ),
          })
          .eq("id", order.event_id);
    }
    await admin
      .from("orders")
      .update({ status: isFullRefund ? "refunded" : "partially_refunded" })
      .eq("id", order.id);
    const { data: refundedOrder } = await admin
      .from("orders")
      .select("customer_id,event_id")
      .eq("id", order.id)
      .single();
    if (refundedOrder?.customer_id)
      await admin
        .from("customer_events")
        .insert({
          customer_id: refundedOrder.customer_id,
          event_id: refundedOrder.event_id,
          event_type: "refund",
          source: "manager",
          value_cents: -amountCents,
          metadata: { refundId: refundRow.id },
        });
    await admin
      .from("audit_log")
      .insert({
        actor_id: userData.user?.id,
        action: isFullRefund ? "order.refunded" : "order.partially_refunded",
        object_type: "order",
        object_id: order.id,
        changes: {
          amountCents,
          ticketIds: invalidated.map((ticket) => ticket.id),
          reason: parsed.data.reason,
        },
      });
    return Response.json({
      refund: {
        id: refundRow.id,
        stripeRefundId: stripeRefund.id,
        amountCents,
        status: "succeeded",
      },
      mode: "connected",
    });
  } catch {
    await admin
      .from("refunds")
      .update({ status: "failed" })
      .eq("id", refundRow.id);
    return Response.json(
      {
        error:
          "Stripe did not complete the refund. Nothing was changed in Oasis.",
      },
      { status: 502 },
    );
  }
}
