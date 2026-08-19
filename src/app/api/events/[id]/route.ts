import { z } from "zod";
import { events } from "@/lib/demo-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { zonedDateTimeToIso } from "@/lib/datetime";

const imageUrl = z
  .string()
  .trim()
  .max(2048)
  .regex(/^(https?:\/\/|\/)/, "Choose a valid image URL.");

const ticketTypeInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(100),
  price: z.coerce.number().min(0).max(10000),
  capacity: z.coerce.number().int().min(1).max(100000),
});

const eventInput = z.object({
  title: z.string().trim().min(2).max(120),
  locationId: z.string().min(1),
  date: z.iso.date(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  template: z.string().max(80),
  description: z.string().max(300),
  ageRestriction: z.string().max(30),
  ticketMode: z.enum(["ticketed", "rsvp", "none"]),
  price: z.coerce.number().min(0).max(10000),
  capacity: z.coerce.number().int().min(0).max(100000),
  ticketTypes: z.array(ticketTypeInput).max(12).optional(),
  destinations: z.array(z.string()).max(10),
  publish: z.boolean(),
  heroImageUrl: imageUrl.optional(),
});

const actionInput = z.object({ action: z.enum(["duplicate", "cancel"]) });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body: unknown = await request.json();
  const action = actionInput.safeParse(body);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    const source =
      events.find((event) => event.id === id || event.slug === id) ?? events[0];
    if (action.success && action.data.action === "duplicate")
      return Response.json({
        event: {
          ...source,
          id: `preview-copy-${Date.now()}`,
          slug: `${source.slug}-copy`,
          title: `${source.title} — Copy`,
          status: "Draft",
        },
        mode: "preview",
      });
    if (action.success && action.data.action === "cancel")
      return Response.json({
        event: { ...source, status: "Needs Attention", ticketStatus: "Draft" },
        mode: "preview",
      });
    const parsedPreview = eventInput.safeParse(body);
    if (!parsedPreview.success)
      return Response.json(
        { error: "Check the event details and try again." },
        { status: 400 },
      );
    return Response.json({
      event: {
        ...source,
        ...parsedPreview.data,
        status: parsedPreview.data.publish ? "Live" : "Draft",
      },
      mode: "preview",
    });
  }

  const selector = /^[0-9a-f-]{36}$/i.test(id) ? "id" : "slug";
  const { data: existing } = await supabase
    .from("events")
    .select("*, ticket_types(*)")
    .eq(selector, id)
    .maybeSingle();
  if (!existing)
    return Response.json(
      { error: "That event could not be found." },
      { status: 404 },
    );
  const { data: userData } = await supabase.auth.getUser();

  if (action.success && action.data.action === "cancel") {
    const { data: cancelled, error } = await supabase
      .from("events")
      .update({ status: "cancelled", ticket_status: "ended" })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error)
      return Response.json(
        { error: "The event could not be cancelled." },
        { status: 500 },
      );
    const { data: schedules } = await supabase
      .from("campaign_schedules")
      .update({ is_active: false })
      .eq("event_id", existing.id)
      .select("id");
    const scheduleIds = (schedules ?? []).map((schedule) => schedule.id);
    if (scheduleIds.length)
      await supabase
        .from("scheduled_posts")
        .update({ status: "disabled" })
        .in("campaign_schedule_id", scheduleIds)
        .in("status", ["pending", "queued"]);
    await supabase.from("audit_log").insert({
      actor_id: userData.user?.id,
      action: "event.cancelled",
      object_type: "event",
      object_id: existing.id,
    });
    return Response.json({ event: cancelled, mode: "connected" });
  }

  if (action.success && action.data.action === "duplicate") {
    const suffix = new Date().toISOString().slice(0, 10);
    const ticketTypes = existing.ticket_types;
    const copy = Object.fromEntries(
      Object.entries(existing).filter(
        ([key]) =>
          !["id", "created_at", "updated_at", "ticket_types"].includes(key),
      ),
    );
    const { data: duplicate, error } = await supabase
      .from("events")
      .insert({
        ...copy,
        slug: `${existing.slug}-${suffix}-${Math.random().toString(36).slice(2, 6)}`,
        title: `${existing.title} — Copy`,
        status: "draft",
        ticket_status: "draft",
        tickets_sold: 0,
        reserved_count: 0,
        checked_in_count: 0,
        gross_revenue_cents: 0,
        created_by: userData.user?.id,
      })
      .select("*")
      .single();
    if (error || !duplicate)
      return Response.json(
        { error: "The event could not be duplicated." },
        { status: 500 },
      );
    await supabase.from("event_locations").insert({
      event_id: duplicate.id,
      location_id: existing.primary_location_id,
    });
    if (Array.isArray(ticketTypes) && ticketTypes.length)
      await supabase.from("ticket_types").insert(
        ticketTypes.map((ticket) => ({
          event_id: duplicate.id,
          name: ticket.name,
          description: ticket.description,
          price_cents: ticket.price_cents,
          fee_cents: ticket.fee_cents,
          capacity: ticket.capacity,
          min_per_order: ticket.min_per_order,
          max_per_order: ticket.max_per_order,
          is_hidden: ticket.is_hidden,
          sort_order: ticket.sort_order,
        })),
      );
    await supabase.from("audit_log").insert({
      actor_id: userData.user?.id,
      action: "event.duplicated",
      object_type: "event",
      object_id: duplicate.id,
      changes: { sourceEventId: existing.id },
    });
    return Response.json(
      { event: duplicate, mode: "connected" },
      { status: 201 },
    );
  }

  const parsed = eventInput.safeParse(body);
  if (!parsed.success)
    return Response.json(
      {
        error: "Check the event details and try again.",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  const input = parsed.data;
  const desiredTicketTypes =
    input.ticketMode === "none"
      ? []
      : input.ticketTypes?.length
        ? input.ticketTypes
        : [
            {
              name: input.ticketMode === "rsvp" ? "RSVP" : "General Admission",
              price: input.ticketMode === "rsvp" ? 0 : input.price,
              capacity: input.capacity,
            },
          ];
  const { data: updated, error } = await supabase
    .from("events")
    .update({
      title: input.title,
      short_description: input.description,
      description: input.description,
      status: input.publish ? "published" : "draft",
      ticket_status:
        input.publish && input.ticketMode !== "none" ? "on_sale" : "draft",
      starts_at: zonedDateTimeToIso(input.date, input.startTime),
      ends_at: zonedDateTimeToIso(
        input.date,
        input.endTime,
        "America/Chicago",
        true,
      ),
      capacity: input.capacity,
      age_restriction: input.ageRestriction,
      hero_image_url: input.heroImageUrl,
      primary_location_id: input.locationId,
    })
    .eq("id", existing.id)
    .select("*")
    .single();
  if (error || !updated)
    return Response.json(
      { error: "The event could not be updated." },
      { status: 500 },
    );
  await supabase
    .from("event_locations")
    .upsert({ event_id: existing.id, location_id: input.locationId });
  const existingTicketTypes: { id: string }[] = Array.isArray(
    existing.ticket_types,
  )
    ? (existing.ticket_types as { id: string }[])
    : [];
  const desiredIds = desiredTicketTypes
    .map((ticket) => ticket.id)
    .filter(Boolean);
  for (const [index, ticket] of desiredTicketTypes.entries()) {
    const values = {
      name: input.ticketMode === "rsvp" ? "RSVP" : ticket.name,
      price_cents:
        input.ticketMode === "rsvp" ? 0 : Math.round(ticket.price * 100),
      capacity: ticket.capacity,
      is_hidden: false,
      sort_order: index,
    };
    if (ticket.id && existingTicketTypes.some((item) => item.id === ticket.id))
      await supabase.from("ticket_types").update(values).eq("id", ticket.id);
    else
      await supabase
        .from("ticket_types")
        .insert({ ...values, event_id: existing.id });
  }
  const removedIds = existingTicketTypes
    .filter((ticket) => !desiredIds.includes(ticket.id))
    .map((ticket) => ticket.id);
  if (removedIds.length)
    await supabase
      .from("ticket_types")
      .update({ is_hidden: true })
      .in("id", removedIds);
  await supabase.from("audit_log").insert({
    actor_id: userData.user?.id,
    action: input.publish ? "event.updated_published" : "event.updated",
    object_type: "event",
    object_id: existing.id,
  });
  return Response.json({ event: updated, mode: "connected" });
}
