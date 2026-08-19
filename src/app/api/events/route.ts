import { randomUUID } from "node:crypto";
import { z } from "zod";
import { events, locations } from "@/lib/demo-data";
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 70);
}

export async function POST(request: Request) {
  const parsed = eventInput.safeParse(await request.json());
  if (!parsed.success)
    return Response.json(
      {
        error: "Check the event details and try again.",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  const input = parsed.data;
  const ticketTypes =
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
  const baseSlug = slugify(input.title);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    const previewEvent = {
      ...events[0],
      id: `preview-${randomUUID().slice(0, 8)}`,
      slug: `${baseSlug}-${input.date}`,
      title: input.title,
      description: input.description,
      shortDescription: input.description,
      date: input.date,
      startsAt: input.startTime,
      endsAt: input.endTime,
      locationId: input.locationId,
      locationName:
        locations.find((location) => location.id === input.locationId)?.name ??
        "Oasis",
      price: ticketTypes[0]?.price ?? input.price,
      capacity: input.capacity,
      sold: 0,
      revenue: 0,
      status: input.publish ? "Live" : "Draft",
      ticketStatus:
        input.ticketMode === "ticketed"
          ? "On Sale"
          : input.ticketMode === "rsvp"
            ? "Free RSVP"
            : "Draft",
      ticketTypes: ticketTypes.map((ticket, index) => ({
        id: `preview-ticket-${index + 1}`,
        name: input.ticketMode === "rsvp" ? "RSVP" : ticket.name,
        price: input.ticketMode === "rsvp" ? 0 : ticket.price,
        capacity: ticket.capacity,
        sold: 0,
        minPerOrder: 1,
        maxPerOrder: 8,
      })),
    };
    return Response.json(
      { event: previewEvent, mode: "preview" },
      { status: 201 },
    );
  }

  const { data: existing } = await supabase
    .from("events")
    .select("slug")
    .like("slug", `${baseSlug}%`);
  const slug = existing?.some((row) => row.slug === baseSlug)
    ? `${baseSlug}-${input.date}`
    : baseSlug;
  const { data: userData } = await supabase.auth.getUser();
  const { data: event, error } = await supabase
    .from("events")
    .insert({
      slug,
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
      created_by: userData.user?.id,
    })
    .select("*")
    .single();
  if (error || !event)
    return Response.json(
      { error: "The event could not be saved. Please try again." },
      { status: 500 },
    );

  await supabase
    .from("event_locations")
    .insert({ event_id: event.id, location_id: input.locationId });
  if (ticketTypes.length) {
    const { error: ticketError } = await supabase.from("ticket_types").insert(
      ticketTypes.map((ticket, index) => ({
        event_id: event.id,
        name: input.ticketMode === "rsvp" ? "RSVP" : ticket.name,
        price_cents:
          input.ticketMode === "rsvp" ? 0 : Math.round(ticket.price * 100),
        capacity: ticket.capacity,
        sort_order: index,
      })),
    );
    if (ticketError) {
      await supabase.from("events").delete().eq("id", event.id);
      return Response.json(
        { error: "The ticket types could not be saved." },
        { status: 500 },
      );
    }
  }
  await supabase.from("audit_log").insert({
    actor_id: userData.user?.id,
    action: input.publish ? "event.published" : "event.created",
    object_type: "event",
    object_id: event.id,
    location_id: input.locationId,
  });
  return Response.json({ event, mode: "connected" }, { status: 201 });
}
