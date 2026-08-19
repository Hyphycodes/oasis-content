import { Resend } from "resend";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function sendTicketConfirmation(orderId: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const admin = createSupabaseAdminClient();
  if (!apiKey || !from || !admin) return { status: "skipped" as const };

  try {
    const { data: order } = await admin.from("orders").select("order_number,secure_order_token,event_id,customer_id").eq("id", orderId).single();
    if (!order) return { status: "skipped" as const };
    const [{ data: customer }, { data: event }, { count }] = await Promise.all([
      admin.from("customers").select("email,first_name").eq("id", order.customer_id).single(),
      admin.from("events").select("title,starts_at").eq("id", order.event_id).single(),
      admin.from("tickets").select("id", { count: "exact", head: true }).eq("order_id", orderId),
    ]);
    if (!customer?.email || !event) return { status: "skipped" as const };
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const walletUrl = `${origin}/tickets/${order.secure_order_token}`;
    const eventDate = new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "short", timeZone: "America/Chicago" }).format(new Date(event.starts_at));
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: customer.email,
      subject: `Your Oasis tickets for ${event.title}`,
      html: `<div style="background:#f5f0e7;padding:32px;font-family:Arial,sans-serif;color:#173c33"><div style="max-width:560px;margin:auto;background:#fffdf8;border-radius:18px;padding:36px"><p style="color:#b45b3f;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">Oasis tickets</p><h1 style="font-family:Georgia,serif;font-weight:400;font-size:36px;margin:10px 0">You’re going, ${customer.first_name ?? "friend"}.</h1><p style="line-height:1.6">Your ${count ?? 0} ${count === 1 ? "ticket is" : "tickets are"} ready for <strong>${event.title}</strong> on ${eventDate}.</p><a href="${walletUrl}" style="display:inline-block;background:#173c33;color:white;text-decoration:none;padding:14px 22px;border-radius:8px;font-weight:700;margin:16px 0">Open your tickets</a><p style="color:#6d766f;font-size:13px">Order ${order.order_number}. Keep this email handy at the door.</p></div></div>`,
    });
    if (error) return { status: "failed" as const, error: error.message };
    return { status: "sent" as const };
  } catch (error) {
    return { status: "failed" as const, error: error instanceof Error ? error.message : "Confirmation email failed." };
  }
}
