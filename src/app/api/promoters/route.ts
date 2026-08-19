import { z } from "zod";
import { events } from "@/lib/demo-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const inputSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254).optional().or(z.literal("")),
    phone: z.string().trim().max(40).optional(),
    socialHandle: z.string().trim().max(80).optional(),
    notes: z.string().trim().max(500).optional(),
  }),
  z.object({
    action: z.literal("link"),
    promoterId: z.string().min(3).max(100),
    eventId: z.string().min(3).max(100),
  }),
]);

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success)
    return Response.json(
      { error: "Add the required promoter and event details." },
      { status: 400 },
    );
  const input = parsed.data;
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    if (input.action === "create")
      return Response.json(
        {
          promoter: {
            id: crypto.randomUUID(),
            name: input.name,
            handle: input.socialHandle || undefined,
            email: input.email || undefined,
            phone: input.phone || undefined,
            notes: input.notes || undefined,
            clicks: 0,
            orders: 0,
            revenue: 0,
          },
          mode: "preview",
        },
        { status: 201 },
      );
    const code = `preview-${crypto.randomUUID().slice(0, 6)}`;
    const previewEvent = events.find((event) => event.id === input.eventId);
    if (!previewEvent)
      return Response.json(
        { error: "Choose an active event." },
        { status: 404 },
      );
    return Response.json(
      {
        link: {
          eventId: input.eventId,
          code,
          destinationUrl: `/e/${previewEvent.slug}?ref=${code}`,
        },
        mode: "preview",
      },
      { status: 201 },
    );
  }

  const { data: userData } = await supabase.auth.getUser();
  if (input.action === "create") {
    const { data: promoter, error } = await supabase
      .from("promoters")
      .insert({
        name: input.name,
        email: input.email || null,
        phone: input.phone || null,
        social_handle: input.socialHandle || null,
        notes: input.notes || null,
      })
      .select("id,name,email,phone,social_handle,notes")
      .single();
    if (error || !promoter)
      return Response.json(
        { error: "The promoter could not be added." },
        { status: 500 },
      );
    await supabase.from("audit_log").insert({
      actor_id: userData.user?.id,
      action: "promoter.created",
      object_type: "promoter",
      object_id: promoter.id,
      changes: { name: promoter.name },
    });
    return Response.json(
      {
        promoter: {
          id: promoter.id,
          name: promoter.name,
          handle: promoter.social_handle ?? undefined,
          email: promoter.email ?? undefined,
          phone: promoter.phone ?? undefined,
          notes: promoter.notes ?? undefined,
          clicks: 0,
          orders: 0,
          revenue: 0,
        },
        mode: "connected",
      },
      { status: 201 },
    );
  }

  const [{ data: promoter }, { data: event }] = await Promise.all([
    supabase
      .from("promoters")
      .select("id,name")
      .eq("id", input.promoterId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("events")
      .select("id,slug,title")
      .eq("id", input.eventId)
      .maybeSingle(),
  ]);
  if (!promoter || !event)
    return Response.json(
      { error: "Choose an active promoter and event." },
      { status: 404 },
    );
  const { data: existing } = await supabase
    .from("promoter_links")
    .select("event_id,code,destination_url")
    .eq("promoter_id", promoter.id)
    .eq("event_id", event.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing)
    return Response.json({
      link: {
        eventId: existing.event_id,
        code: existing.code,
        destinationUrl: existing.destination_url,
      },
      mode: "connected",
    });

  const code = `${slugify(promoter.name) || "oasis"}-${crypto.randomUUID().slice(0, 6)}`;
  const destinationUrl = `/e/${event.slug}?ref=${code}`;
  const { data: link, error } = await supabase
    .from("promoter_links")
    .insert({
      promoter_id: promoter.id,
      event_id: event.id,
      code,
      destination_url: destinationUrl,
    })
    .select("event_id,code,destination_url")
    .single();
  if (error || !link)
    return Response.json(
      { error: "The promoter link could not be created." },
      { status: 500 },
    );
  await supabase.from("audit_log").insert({
    actor_id: userData.user?.id,
    action: "promoter.link_created",
    object_type: "promoter",
    object_id: promoter.id,
    changes: { eventId: event.id, code },
  });
  return Response.json(
    {
      link: {
        eventId: link.event_id,
        code: link.code,
        destinationUrl: link.destination_url,
      },
      mode: "connected",
    },
    { status: 201 },
  );
}
