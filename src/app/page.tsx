import {
  ArrowRight,
  CalendarDays,
  MapPin,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { PublicHeader } from "@/components/public-header";
import { TrackView } from "@/components/analytics/track-view";
import { getPublishedEvents, getSiteCopy } from "@/lib/data";
import { formatEventDate } from "@/lib/demo-data";

export const metadata = {
  title: "Oasis Mexican Kitchen & Bar",
  description:
    "Good food, good music, and the events that bring Fort Worth together.",
};
export const dynamic = "force-dynamic";

export default async function Home() {
  const [siteCopy, allEvents] = await Promise.all([
    getSiteCopy(),
    getPublishedEvents(),
  ]);
  const upcoming = allEvents.slice(0, 3);
  const copy = siteCopy ?? {
    hero: "Good food. Good music. Good people.",
    subtitle: "Mexican kitchen, bar, and culture—made for getting together.",
    heroImage:
      "https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=1800&q=88",
    primaryCta: "See what’s on",
    secondaryCta: "Explore the menu",
    eventsHeading: "There’s always a reason to stay awhile.",
    banner: "",
    privateEvents:
      "Bring your celebration to Oasis. We’ll help shape the menu, music, and room around your people.",
    phone: "(817) 555-0148",
    address: "Fort Worth, Texas",
    hours: "Tue–Sun · 11am–2am",
    reservationUrl: "tel:+18175550148",
  };

  return (
    <main className="public-site oasis-home">
      <TrackView eventName="page_view" />
      <PublicHeader />
      {copy.banner ? (
        <Link className="home-banner" href="/events">
          <Sparkles />
          {copy.banner}
          <ArrowRight />
        </Link>
      ) : null}
      <section className="home-hero">
        <Image
          src={copy.heroImage}
          alt="Friends gathering around a table at Oasis"
          fill
          sizes="100vw"
          priority
        />
        <div className="home-hero-shade" />
        <div className="home-hero-copy">
          <span className="kicker">Oasis Mexican Kitchen &amp; Bar</span>
          <h1>{copy.hero}</h1>
          <p>{copy.subtitle}</p>
          <div>
            <Link className="button home-primary" href="/events">
              {copy.primaryCta} <ArrowRight />
            </Link>
            <Link className="button home-secondary" href="/menu">
              {copy.secondaryCta}
            </Link>
          </div>
        </div>
        <span className="home-scroll-note">Fort Worth · Texas</span>
      </section>

      <section className="home-events">
        <header>
          <div>
            <span className="kicker">Gather at Oasis</span>
            <h2>{copy.eventsHeading}</h2>
          </div>
          <Link href="/events">
            View all events <ArrowRight />
          </Link>
        </header>
        {upcoming.length ? (
          <div>
            {upcoming.map((event) => (
              <Link
                className="home-event-card"
                href={`/e/${event.slug}`}
                key={event.id}
              >
                <div>
                  <Image
                    src={event.imageUrl}
                    alt={event.imageAlt}
                    fill
                    sizes="(max-width: 800px) 100vw, 33vw"
                  />
                  <span>{event.ticketStatus}</span>
                </div>
                <span className="eyebrow">{event.eyebrow}</span>
                <h3>{event.title}</h3>
                <p>
                  <CalendarDays />
                  {formatEventDate(event.date, "short")} · {event.startsAt}
                </p>
                <p>
                  <MapPin />
                  {event.locationName}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="public-events-empty">
            <h3>The next gathering is taking shape.</h3>
            <p>Check back soon for live music, brunch, and community nights.</p>
          </div>
        )}
      </section>

      <section className="home-menu-story">
        <div className="home-menu-image">
          <Image
            src="https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=1400&q=86"
            alt="Colorful Mexican food prepared for sharing"
            fill
            sizes="(max-width: 800px) 100vw, 50vw"
          />
        </div>
        <div>
          <UtensilsCrossed />
          <span className="kicker">Made for the table</span>
          <h2>Bright flavors. Cold drinks. No rush.</h2>
          <p>
            Mexican comfort food, seasonal cocktails, and plates meant to be
            passed around.
          </p>
          <Link className="button button-primary" href="/menu">
            View the menu <ArrowRight />
          </Link>
        </div>
      </section>

      <section className="home-private">
        <span className="kicker">Private events</span>
        <h2>Your people. Your moment. Our place.</h2>
        <p>{copy.privateEvents}</p>
        <a
          className="button home-primary"
          href="mailto:events@oasiskitchen.com"
        >
          Start planning <ArrowRight />
        </a>
      </section>

      <footer className="public-footer" id="visit">
        <Logo href="/" />
        <p>
          {copy.address} · {copy.hours} · {copy.phone}
        </p>
        <div>
          <Link href="/events">Events</Link>
          <Link href="/menu">Menu</Link>
          <a href={copy.reservationUrl}>Reserve</a>
          <Link href="/go">Oasis Links</Link>
          <Link href="/admin">Team sign in</Link>
        </div>
      </footer>
    </main>
  );
}
