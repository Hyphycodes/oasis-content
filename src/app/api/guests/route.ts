import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  eventId: z.string().min(3).max(100),
  name: z.string().trim().min(2).max(120),
  partySize: z.number().int().min(1).max(20),
  type: z.enum([
    "Guest",
    "Owner Guest",
    "Comp",
    "Influencer",
    "Promoter",
    "Artist",
    "Staff",
    "Partner",
    "VIP",
    "Other",
  ]),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
  promoterId: z.string().uuid().optional(),
  notes: z.string().trim().max(300).optional(),
});

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success)
    return Response.json(
      { error: "Add a guest name, party size, and type." },
      { status: 400 },
    );
  const input = parsed.data;
  const supabase = await createSupabaseServerClient();
  if (!supabase)
    return Response.json(
      {
        guest: {
          id: crypto.randomUUID(),
          name: input.name,
          partySize: input.partySize,
          type: input.type,
          status: "Expected",
          note: input.notes,
        },
        mode: "preview",
      },
      { status: 201 },
    );
  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", input.eventId)
    .maybeSingle();
  if (!event)
    return Response.json({ error: "Choose an active event." }, { status: 404 });
  const { data: userData } = await supabase.auth.getUser();
  let guestGroupId: string | null = null;
  if (input.promoterId) {
    const { data: promoter } = await supabase
      .from("promoters")
      .select("id,name")
      .eq("id", input.promoterId)
      .eq("is_active", true)
      .maybeSingle();
    if (!promoter)
      return Response.json(
        { error: "Choose an active promoter." },
        { status: 404 },
      );
    const { data: existingGroup } = await supabase
      .from("guest_groups")
      .select("id")
      .eq("event_id", event.id)
      .eq("promoter_id", promoter.id)
      .maybeSingle();
    if (existingGroup) guestGroupId = existingGroup.id;
    else {
      const { data: group, error: groupError } = await supabase
        .from("guest_groups")
        .insert({
          event_id: event.id,
          promoter_id: promoter.id,
          name: `${promoter.name} guests`,
          created_by: userData.user?.id,
        })
        .select("id")
        .single();
      if (groupError || !group)
        return Response.json(
          { error: "The promoter group could not be prepared." },
          { status: 500 },
        );
      guestGroupId = group.id;
    }
  }
  const { data: guest, error } = await supabase
    .from("guests")
    .insert({
      event_id: event.id,
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      party_size: input.partySize,
      guest_type: input.type.toLowerCase().replaceAll(" ", "_"),
      guest_group_id: guestGroupId,
      notes: input.notes || null,
    })
    .select("*")
    .single();
  if (error || !guest)
    return Response.json(
      { error: "The guest could not be added." },
      { status: 500 },
    );
  await supabase.from("audit_log").insert({
    actor_id: userData.user?.id,
    action: "guest.added",
    object_type: "guest",
    object_id: guest.id,
    changes: { partySize: input.partySize, type: input.type },
  });
  return Response.json(
    {
      guest: {
        id: guest.id,
        name: guest.name,
        partySize: guest.party_size,
        type: input.type,
        status: "Expected",
        note: guest.notes,
      },
      mode: "connected",
    },
    { status: 201 },
  );
}
