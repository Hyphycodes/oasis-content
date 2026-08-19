import { CalendarPlus } from "lucide-react";
import Link from "next/link";
import { EventCollection } from "@/components/events/event-collection";
import { PageHeader } from "@/components/ui";
import { getEvents } from "@/lib/data";

export const metadata = { title: "Events" };

export default async function EventsPage() {
  const allEvents = await getEvents();
  return (
    <>
      <PageHeader
        eyebrow="The heartbeat of Oasis"
        title="Events"
        description="Create it once, then let Oasis handle the page, tickets, posts, links, and archive."
        actions={
          <Link className="button button-primary" href="/admin/events/new">
            <CalendarPlus size={18} />
            Create event
          </Link>
        }
      />
      <EventCollection events={allEvents} />
    </>
  );
}
