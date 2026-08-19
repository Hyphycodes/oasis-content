import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const checkInSchema = z.object({ guestId: z.string().uuid(), quantity: z.number().int().min(1).max(20) });

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return Response.json({ guests: [] });
  const supabase = await createSupabaseServerClient();
  if (!supabase) return Response.json({ guests: [{ id: "11111111-1111-4111-8111-111111111111", name: "Isabel Moreno", partySize: 2, checkedInCount: 0, type: "Comp", note: "Birthday — welcome drink" }], mode: "preview" });
  const safeQuery = query.replace(/[%_,()]/g, "");
  const { data, error } = await supabase.from("guests").select("id,name,party_size,checked_in_count,guest_type,notes,event_id").or(`name.ilike.%${safeQuery}%,email.ilike.%${safeQuery}%,phone.ilike.%${safeQuery}%`).limit(10);
  if (error) return Response.json({ error: "Guest search is unavailable. Try again." }, { status: 500 });
  return Response.json({ guests: (data ?? []).map((guest) => ({ id: guest.id, name: guest.name, partySize: guest.party_size, checkedInCount: guest.checked_in_count, type: guest.guest_type, note: guest.notes })) });
}

export async function PATCH(request: Request) {
  const parsed = checkInSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Choose a valid guest and party size." }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  if (!supabase) return Response.json({ result: "valid", name: "Isabel Moreno", ticketType: `${parsed.data.quantity} guest${parsed.data.quantity === 1 ? "" : "s"}`, checkedInAt: new Date().toISOString(), remaining: Math.max(0, 2 - parsed.data.quantity), mode: "preview" });
  const { data, error } = await supabase.rpc("check_in_guest", { p_guest_id: parsed.data.guestId, p_quantity: parsed.data.quantity });
  if (error) return Response.json({ error: "The guest could not be checked in." }, { status: 500 });
  return Response.json(data);
}
