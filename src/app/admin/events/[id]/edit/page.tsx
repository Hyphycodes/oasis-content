import { notFound } from "next/navigation";
import { EventWizard } from "@/components/events/event-wizard";
import { getEventById, getLocations } from "@/lib/data";

function to24Hour(value: string) {
  const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return value.slice(0, 5);
  let hour = Number(match[1]);
  const period = match[3].toUpperCase();
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, locations] = await Promise.all([
    getEventById(id),
    getLocations(),
  ]);
  if (!event) notFound();
  return (
    <EventWizard
      locationOptions={locations}
      initialEvent={{
        id: event.id,
        heroImageUrl: event.imageUrl,
        draft: {
          title: event.title,
          locationId: event.locationId,
          date: event.date,
          startTime: to24Hour(event.startsAt),
          endTime: to24Hour(event.endsAt),
          template: event.template ?? "Start Fresh",
          description: event.description,
          ageRestriction: event.ageRestriction ?? "21+",
          ticketMode:
            event.ticketStatus === "Free RSVP"
              ? "rsvp"
              : event.ticketStatus === "Draft" && event.capacity === 0
                ? "none"
                : "ticketed",
          price: String(event.price),
          capacity: String(event.capacity),
          ticketTypes: event.ticketTypes?.map((ticket) => ({
            id: ticket.id,
            name: ticket.name,
            price: String(ticket.price),
            capacity: String(ticket.capacity),
          })),
          destinations: event.destinations.map(
            (destination) => destination.name,
          ),
        },
      }}
    />
  );
}
