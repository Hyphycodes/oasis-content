import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Check,
  CircleAlert,
  Clock3,
  Copy,
  ExternalLink,
  MapPin,
  Megaphone,
  Pencil,
  QrCode,
  Ticket,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusPill } from "@/components/ui";
import { EventActions } from "@/components/events/event-actions";
import { RetryPublishButton } from "@/components/publishing/retry-publish-button";
import { getEventById } from "@/lib/data";
import { currency, events, formatEventDate } from "@/lib/demo-data";

const tabs = [
  "Overview",
  "Tickets",
  "Guests",
  "Content",
  "Campaign",
  "Analytics",
  "Settings",
];
const destinationKey = {
  Website: "website",
  Tickets: "tickets",
  "Oasis Links": "oasis_links",
  "Google Drive": "google_drive",
  Instagram: "instagram",
  Facebook: "facebook",
  Google: "google_business",
} as const;

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string;
    created?: string;
    publishing?: string;
  }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const event =
    (await getEventById(id)) ??
    (id.startsWith("preview-") ? events[3] : undefined);
  if (!event) notFound();
  const activeTab = tabs.includes(query.tab ?? "") ? query.tab! : "Overview";
  const soldPercent = Math.round((event.sold / event.capacity) * 100);
  return (
    <>
      <Link className="back-link" href="/admin/events">
        <ArrowLeft size={15} />
        All events
      </Link>
      {query.created && (
        <div className="success-banner">
          <span>
            <Check size={16} />
          </span>
          <div>
            <strong>
              {query.created === "publish"
                ? "Your event is on its way."
                : "Draft saved."}
            </strong>
            <small>
              {query.created === "publish"
                ? "Each destination is publishing independently. You can leave this page safely."
                : "Come back anytime to finish and publish it."}
            </small>
          </div>
        </div>
      )}
      {query.publishing === "attention" && (
        <div className="success-banner warning">
          <span>
            <CircleAlert size={16} />
          </span>
          <div>
            <strong>The event is live, but publishing needs attention.</strong>
            <small>
              Retry the affected destination from this page; the event itself
              was saved safely.
            </small>
          </div>
        </div>
      )}
      <section className="event-detail-hero">
        <div className="event-detail-image">
          <Image
            src={event.imageUrl}
            alt={event.imageAlt}
            fill
            sizes="(max-width: 800px) 100vw, 38vw"
            priority
          />
          <Link
            className="button button-light"
            href={`/admin/events/${event.id}/edit`}
          >
            <Pencil size={15} />
            Replace flyer
          </Link>
        </div>
        <div className="event-detail-copy">
          <div className="event-detail-status">
            <StatusPill status={event.status} />
            <span>Updated 12 minutes ago</span>
          </div>
          <span className="eyebrow">{event.eyebrow}</span>
          <h1>{event.title}</h1>
          <div className="event-facts">
            <span>
              <CalendarDays />
              {formatEventDate(event.date)}
            </span>
            <span>
              <Clock3 />
              {event.startsAt}–{event.endsAt}
            </span>
            <span>
              <MapPin />
              {event.locationName}
            </span>
          </div>
          <div className="event-detail-actions">
            <EventActions eventId={event.id} eventTitle={event.title} />
            <Link
              className="button button-secondary"
              href={`/e/${event.slug}`}
              target="_blank"
            >
              Public page
              <ExternalLink size={15} />
            </Link>
          </div>
        </div>
      </section>

      <nav className="detail-tabs" aria-label="Event sections">
        {tabs.map((tab) => (
          <Link
            className={activeTab === tab ? "active" : ""}
            href={`/admin/events/${id}?tab=${tab}`}
            key={tab}
          >
            {tab}
          </Link>
        ))}
      </nav>

      {activeTab === "Overview" && (
        <div className="event-overview-grid">
          <div className="overview-main">
            <section className="metrics-row">
              <div className="metric-card">
                <span>
                  <Ticket />
                </span>
                <strong>{event.sold}</strong>
                <small>Tickets sold</small>
                <em>{soldPercent}% full</em>
              </div>
              <div className="metric-card">
                <span>
                  <BarChart3 />
                </span>
                <strong>{currency(event.revenue)}</strong>
                <small>Gross sales</small>
                <em>+$684 this week</em>
              </div>
              <div className="metric-card">
                <span>
                  <UsersRound />
                </span>
                <strong>{event.checkedIn}</strong>
                <small>Checked in</small>
                <em>Door opens {event.doorsAt}</em>
              </div>
            </section>

            <section className="panel overview-panel">
              <div className="panel-title">
                <div>
                  <span className="kicker">Guest experience</span>
                  <h2>Sales & capacity</h2>
                </div>
                <Link href={`/admin/events/${id}?tab=Tickets`}>
                  View tickets →
                </Link>
              </div>
              <div className="capacity-visual">
                <div
                  className="capacity-ring"
                  style={
                    {
                      "--fill": `${soldPercent * 3.6}deg`,
                    } as React.CSSProperties
                  }
                >
                  <span>
                    <strong>{soldPercent}%</strong>
                    <small>full</small>
                  </span>
                </div>
                <div>
                  <h3>
                    {event.capacity - event.sold} spots are still available
                  </h3>
                  <p>
                    {event.sold} of {event.capacity} tickets have been claimed.
                  </p>
                  <div className="legend-row">
                    <span>
                      <i className="sold" />
                      Sold
                    </span>
                    <span>
                      <i />
                      Available
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="panel overview-panel">
              <div className="panel-title">
                <div>
                  <span className="kicker">Next up</span>
                  <h2>Campaign timeline</h2>
                </div>
                <Link href={`/admin/events/${id}?tab=Campaign`}>
                  Open campaign →
                </Link>
              </div>
              <div className="timeline-row">
                <span className="timeline-icon">
                  <Megaphone />
                </span>
                <span>
                  <strong>Final-call post</strong>
                  <small>Instagram + Facebook · Today at 6:30 PM</small>
                </span>
                <StatusPill status="Scheduled" />
              </div>
            </section>
          </div>

          <aside className="overview-side">
            <section className="panel overview-panel">
              <div className="panel-title">
                <div>
                  <span className="kicker">Publish everywhere</span>
                  <h2>Destinations</h2>
                </div>
              </div>
              <div className="destination-status-list">
                {event.destinations.map((destination) => (
                  <div key={destination.name}>
                    <span
                      className={
                        destination.status === "Needs Attention"
                          ? "destination-symbol attention"
                          : "destination-symbol"
                      }
                    >
                      {destination.status === "Needs Attention" ? (
                        <CircleAlert />
                      ) : (
                        <Check />
                      )}
                    </span>
                    <span>
                      <strong>{destination.name}</strong>
                      <small>{destination.detail ?? destination.status}</small>
                    </span>
                    {destination.status === "Needs Attention" && (
                      <RetryPublishButton
                        eventId={event.id}
                        destination={destinationKey[destination.name]}
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
            <section className="panel quick-actions">
              <span className="kicker">Quick actions</span>
              <Link href="/check-in">
                <QrCode />
                Open door scanner
              </Link>
              <Link href={`/admin/events/${id}?tab=Guests`}>
                <UsersRound />
                Add a guest
              </Link>
              <Link href={`/admin/events/${event.id}/edit`}>
                <Copy />
                Use as a starting point
              </Link>
            </section>
          </aside>
        </div>
      )}

      {activeTab !== "Overview" && (
        <section className="panel tab-placeholder">
          <span className="kicker">{event.title}</span>
          <h2>{activeTab}</h2>
          <p>
            This workspace stays tied to the event, so the team never has to
            hunt across the app.
          </p>
          <Link
            className="button button-primary"
            href={
              activeTab === "Guests"
                ? "/admin/guests"
                : activeTab === "Content" || activeTab === "Campaign"
                  ? "/admin/content"
                  : activeTab === "Analytics"
                    ? "/admin/analytics"
                    : "/admin/tickets"
            }
          >
            Open {activeTab.toLowerCase()}
          </Link>
        </section>
      )}
    </>
  );
}
