import {
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  MenuSquare,
  Phone,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import Image from "next/image";
import { TrackedLink } from "@/components/links/tracked-link";
import { Logo } from "@/components/logo";
import { getLocations, getPublishedEvents } from "@/lib/data";
import { formatEventDate } from "@/lib/demo-data";

export const metadata = {
  title: "Oasis Links",
  description:
    "Events, reservations, menu, and directions for Oasis Mexican Kitchen & Bar.",
};
export const dynamic = "force-dynamic";

export default async function OasisLinksPage() {
  const [publishedEvents, locations] = await Promise.all([
    getPublishedEvents(),
    getLocations(),
  ]);
  const events = publishedEvents.filter(
    (event) => new Date(`${event.date}T23:59:59`) >= new Date(),
  );
  const primary = events[0];
  if (!primary)
    return (
      <main className="links-page">
        <header className="links-header">
          <Logo href="/events" />
          <p>Mexican kitchen · Bar · Cultura</p>
        </header>
        <section className="links-empty">
          <Sparkles />
          <h1>The next Oasis night is taking shape.</h1>
          <p>
            Check the menu, reserve a table, or come back soon for new events.
          </p>
        </section>
      </main>
    );
  const primaryLocation =
    locations.find((location) => location.id === primary.locationId) ??
    locations[0];
  const reservationUrl = process.env.NEXT_PUBLIC_RESERVATION_URL?.trim();
  const directionsAddress = primary.address || primaryLocation?.address;
  const phone = primaryLocation?.phone?.trim();
  const phoneUrl = phone ? `tel:${phone.replace(/[^+\d]/g, "")}` : null;
  return (
    <main className="links-page">
      <div className="links-glow one" />
      <div className="links-glow two" />
      <header className="links-header">
        <Logo href="/events" />
        <p>Mexican kitchen · Bar · Cultura</p>
      </header>
      <section className="links-evergreen">
        {reservationUrl ? (
          <TrackedLink href={reservationUrl}>
            <span>
              <UtensilsCrossed />
            </span>
            <strong>Reserve a table</strong>
            <small>Dinner, brunch, and celebrations</small>
            <ArrowRight />
          </TrackedLink>
        ) : null}
        <TrackedLink href="/menu">
          <span>
            <MenuSquare />
          </span>
          <strong>View the menu</strong>
          <small>Food, drinks, and seasonal specials</small>
          <ArrowRight />
        </TrackedLink>
        {directionsAddress ? (
          <TrackedLink
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(directionsAddress)}`}
          >
            <span>
              <MapPin />
            </span>
            <strong>Directions</strong>
            <small>{primary.locationName}</small>
            <ArrowRight />
          </TrackedLink>
        ) : null}
      </section>
      <section className="links-events">
        <div className="links-section-heading">
          <span className="kicker">This week</span>
          <h1>Something good is happening.</h1>
        </div>
        <TrackedLink
          className="featured-link-event"
          href={`/e/${primary.slug}?utm_source=oasis_links&utm_medium=bio`}
          eventId={primary.id}
        >
          <div className="featured-link-image">
            <Image
              src={primary.imageUrl}
              alt={primary.imageAlt}
              fill
              sizes="(max-width: 640px) 100vw, 580px"
              priority
            />
            <span>{primary.capacity - primary.sold} left</span>
          </div>
          <div>
            <span className="eyebrow">{primary.eyebrow}</span>
            <h2>{primary.title}</h2>
            <p>
              <CalendarDays />
              {formatEventDate(primary.date, "short")} · {primary.startsAt}
            </p>
            <p>
              <MapPin />
              {primary.locationName}
            </p>
            <span className="link-event-cta">
              Get tickets · ${primary.price}
              <ArrowRight />
            </span>
          </div>
        </TrackedLink>
        <div className="next-link-events">
          <span className="kicker">Next up</span>
          {events.slice(1).map((event) => (
            <TrackedLink
              href={`/e/${event.slug}?utm_source=oasis_links&utm_medium=bio`}
              eventId={event.id}
              key={event.id}
            >
              <Image src={event.imageUrl} alt="" width={68} height={68} />
              <span>
                <strong>{event.title}</strong>
                <small>
                  <CalendarDays />
                  {formatEventDate(event.date, "short")}
                </small>
                <small>
                  <Clock3 />
                  {event.startsAt} · {event.locationName.replace("Oasis ", "")}
                </small>
              </span>
              <em>
                {event.ticketStatus === "Sold Out"
                  ? "Sold out"
                  : event.price
                    ? `$${event.price}`
                    : "RSVP"}
              </em>
              <ArrowRight />
            </TrackedLink>
          ))}
        </div>
      </section>
      {phoneUrl ? (
        <section className="links-bottom-actions">
          <TrackedLink href={phoneUrl}>
            <Phone />
            Call Oasis
          </TrackedLink>
        </section>
      ) : null}
      <footer className="links-footer">
        <Logo href="/events" />
        <p>Good food. Good music. Good people.</p>
        <span>© 2026 Oasis</span>
      </footer>
    </main>
  );
}
