import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { PublicHeader } from "@/components/public-header";
import { getPublishedEvents } from "@/lib/data";
import { formatEventDate } from "@/lib/demo-data";

export const metadata = {
  title: "Events at Oasis",
  description:
    "Live music, brunch, dance nights, and community gatherings at Oasis.",
};
export const dynamic = "force-dynamic";

export default async function PublicEventsPage() {
  const events = await getPublishedEvents();
  const locationNames = [
    ...new Set(events.map((event) => event.locationName).filter(Boolean)),
  ];
  return (
    <main className="public-site">
      <PublicHeader />
      <section className="public-events-hero">
        <span className="kicker">Oasis presents</span>
        <h1>
          Come for dinner.
          <br />
          Stay for the story.
        </h1>
        <p>
          Live music, dance nights, brunch, and the kind of gatherings that turn
          strangers into regulars.
        </p>
      </section>
      <section className="public-event-list">
        <div className="public-section-head">
          <h2>What’s coming up</h2>
          <span>
            {events.length
              ? `${events.length} moments to look forward to`
              : "New dates coming soon"}
          </span>
        </div>
        {events.length ? (
          <div className="public-event-grid">
            {events.map((event, index) => (
              <Link
                href={`/e/${event.slug}`}
                className={
                  index === 0 ? "public-event featured" : "public-event"
                }
                key={event.id}
              >
                <div className="public-event-image">
                  <Image
                    src={event.imageUrl}
                    alt={event.imageAlt}
                    fill
                    sizes={
                      index === 0
                        ? "(max-width: 800px) 100vw, 60vw"
                        : "(max-width: 800px) 100vw, 33vw"
                    }
                  />
                  <span>{event.ticketStatus}</span>
                </div>
                <div className="public-event-copy">
                  <span className="eyebrow">{event.eyebrow}</span>
                  <h3>{event.title}</h3>
                  <p>
                    <CalendarDays />
                    {formatEventDate(event.date)} · {event.startsAt}
                  </p>
                  <p>
                    <MapPin />
                    {event.locationName}
                  </p>
                  <span className="public-event-link">
                    {event.price ? `Tickets from $${event.price}` : "Free RSVP"}
                    <ArrowRight />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="public-events-empty">
            <h3>The next gathering is taking shape.</h3>
            <p>
              Follow Oasis or check back soon for live music, brunch, and
              community nights.
            </p>
            <Link className="button public-ticket-button" href="/menu">
              Explore the menu
            </Link>
          </div>
        )}
      </section>
      <footer className="public-footer" id="visit">
        <Logo href="/events" />
        <p>Official events from Oasis Mexican Kitchen &amp; Bar.</p>
        {locationNames.length ? (
          <div>
            {locationNames.map((location) => (
              <span key={location}>{location}</span>
            ))}
          </div>
        ) : null}
      </footer>
    </main>
  );
}
