import { ArrowLeft, CalendarPlus, MapPin, Ticket } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";
import { PublicHeader } from "@/components/public-header";
import { ShareButton } from "@/components/share-button";
import { TrackView } from "@/components/analytics/track-view";
import { WaitlistForm } from "@/components/tickets/waitlist-form";
import { getEventById, getPublishedEvents } from "@/lib/data";
import { formatEventDate } from "@/lib/demo-data";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventById(slug);
  if (!event) return { title: "Event not found" };
  return {
    title: event.title,
    description: event.shortDescription,
    openGraph: {
      title: event.title,
      description: event.shortDescription,
      images: [event.imageUrl],
    },
  };
}

export default async function PublicEventPage({ params }: Props) {
  const { slug } = await params;
  const event = await getEventById(slug);
  if (!event) notFound();
  const related = (await getPublishedEvents())
    .filter((item) => item.id !== event.id)
    .slice(0, 2);
  const soldOut =
    event.ticketStatus === "Sold Out" ||
    (event.capacity > 0 && event.sold >= event.capacity);
  const calendarDates = `${event.date.replaceAll("-", "")}T${event.startsAt.replace(/[^0-9]/g, "").padEnd(6, "0")}/${event.date.replaceAll("-", "")}T${event.endsAt.replace(/[^0-9]/g, "").padEnd(6, "0")}`;
  return (
    <main className="public-site public-detail">
      <TrackView eventName="event_view" eventId={event.id} />
      <PublicHeader />
      <Link className="public-back" href="/events">
        <ArrowLeft />
        All events
      </Link>
      <section className="public-detail-hero">
        <div className="public-detail-image">
          <Image
            src={event.imageUrl}
            alt={event.imageAlt}
            fill
            sizes="(max-width: 850px) 100vw, 52vw"
            priority
          />
        </div>
        <div className="public-detail-copy">
          <span className="eyebrow">{event.eyebrow}</span>
          <h1>{event.title}</h1>
          <p className="public-lede">{event.shortDescription}</p>
          <div className="public-facts">
            <span>
              <strong>
                <CalendarPlus />
                {formatEventDate(event.date)}
              </strong>
              <small>
                {event.startsAt}–{event.endsAt} · Doors {event.doorsAt}
              </small>
            </span>
            <span>
              <strong>
                <MapPin />
                {event.locationName}
              </strong>
              <small>{event.address}</small>
            </span>
          </div>
          <div className="public-detail-buttons">
            <a className="button public-ticket-button" href="#tickets">
              <Ticket />
              {soldOut
                ? "Join the waitlist"
                : event.price
                  ? `Get tickets · $${event.price}`
                  : "Reserve a spot"}
            </a>
            <a
              className="icon-button"
              aria-label="Add to calendar"
              href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${calendarDates}&location=${encodeURIComponent(event.address)}`}
              target="_blank"
            >
              <CalendarPlus />
            </a>
            <ShareButton title={event.title} />
          </div>
        </div>
      </section>
      <section className="public-detail-body">
        <article>
          <span className="kicker">About the night</span>
          <h2>A reason to get together.</h2>
          <p>{event.description}</p>
          <div className="venue-note">
            <MapPin />
            <span>
              <strong>{event.locationName}</strong>
              <small>{event.address}</small>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`}
                target="_blank"
              >
                Get directions →
              </a>
            </span>
          </div>
        </article>
        <aside className="ticket-selector" id="tickets">
          <span className="kicker">
            {soldOut ? "Stay close" : "Choose your spot"}
          </span>
          <h2>{soldOut ? "Join the waitlist" : event.ticketStatus}</h2>
          {soldOut ? (
            <>
              <p className="waitlist-copy">
                If space opens, we’ll let you know right away. No payment is
                collected now.
              </p>
              <WaitlistForm slug={event.slug} />
            </>
          ) : (
            <>
              <div className="ticket-choice">
                <span>
                  <strong>{event.price ? "General admission" : "RSVP"}</strong>
                  <small>{event.ageRestriction ?? "All guests welcome"}</small>
                </span>
                <strong>{event.price ? `$${event.price}` : "Free"}</strong>
              </div>
              <div className="public-quantity-links">
                <span>How many?</span>
                {[1, 2, 3, 4].map((quantity) => (
                  <Link
                    className="button button-secondary"
                    href={`/checkout/${event.slug}?quantity=${quantity}`}
                    key={quantity}
                  >
                    {quantity}
                  </Link>
                ))}
              </div>
              <Link
                className="button public-ticket-button"
                href={`/checkout/${event.slug}`}
              >
                <Ticket />
                Continue to checkout
              </Link>
              <p>Secure checkout · Tickets stay on Oasis</p>
            </>
          )}
        </aside>
      </section>
      <section className="related-events">
        <span className="kicker">Keep the night going</span>
        <h2>More at Oasis</h2>
        <div>
          {related.map((item) => (
            <Link href={`/e/${item.slug}`} key={item.id}>
              <div>
                <Image
                  src={item.imageUrl}
                  alt={item.imageAlt}
                  fill
                  sizes="(max-width: 800px) 100vw, 45vw"
                />
              </div>
              <span>
                <strong>{item.title}</strong>
                <small>{formatEventDate(item.date, "short")}</small>
              </span>
            </Link>
          ))}
        </div>
      </section>
      <footer className="public-footer">
        <Logo href="/" />
        <p>Mexican kitchen, bar, and culture in Fort Worth.</p>
      </footer>
    </main>
  );
}
