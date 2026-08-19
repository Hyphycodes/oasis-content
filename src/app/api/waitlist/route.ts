import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const inputSchema = z.object({ slug: z.string().min(2).max(100), email: z.email(), quantity: z.number().int().min(1).max(10) });

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Enter a valid email and party size." }, { status: 400 });
  const input = parsed.data;
  const admin = createSupabaseAdminClient();
  if (!admin) return Response.json({ status: "waiting", mode: "preview" }, { status: 201 });
  const { data: event } = await admin.from("events").select("id,status,ticket_status").eq("slug", input.slug).eq("status", "published").maybeSingle();
  if (!event) return Response.json({ error: "This event is not accepting a waitlist." }, { status: 404 });
  const email = input.email.toLowerCase();
  const { data: existing } = await admin.from("waitlist_entries").select("id,status").eq("event_id", event.id).ilike("email", email).in("status", ["waiting", "invited"]).maybeSingle();
  if (existing) return Response.json({ status: existing.status, alreadyJoined: true });
  let { data: customer } = await admin.from("customers").select("id").ilike("email", email).is("archived_at", null).maybeSingle();
  if (!customer) {
    const { data: created } = await admin.from("customers").insert({ email, source: "waitlist" }).select("id").single();
    customer = created;
  }
  const { data: entry, error } = await admin.from("waitlist_entries").insert({ event_id: event.id, customer_id: customer?.id, email, quantity: input.quantity }).select("id,status").single();
  if (error || !entry) return Response.json({ error: "The waitlist could not be updated. Try again." }, { status: 500 });
  if (customer) await admin.from("customer_events").insert({ customer_id: customer.id, event_id: event.id, event_type: "rsvp", source: "waitlist" });
  return Response.json({ status: entry.status, mode: "connected" }, { status: 201 });
}
