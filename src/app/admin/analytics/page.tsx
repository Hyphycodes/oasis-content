import { ArrowRight, CircleDollarSign, TrendingUp } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { getAnalyticsSnapshot, getEvents } from "@/lib/data";
import { currency } from "@/lib/demo-data";

const previewSources = [
  {
    name: "Instagram",
    visits: 1240,
    orders: 138,
    tickets: 191,
    revenue: 4298,
    color: "#c86549",
  },
  {
    name: "Oasis Links",
    visits: 864,
    orders: 116,
    tickets: 154,
    revenue: 3384,
    color: "#e8a84e",
  },
  {
    name: "Direct",
    visits: 612,
    orders: 77,
    tickets: 103,
    revenue: 2292,
    color: "#377660",
  },
  {
    name: "Promoters",
    visits: 521,
    orders: 61,
    tickets: 87,
    revenue: 1984,
    color: "#527d8d",
  },
  {
    name: "Google",
    visits: 402,
    orders: 35,
    tickets: 49,
    revenue: 1082,
    color: "#8e796b",
  },
];
const previewFunnel = [
  { label: "Event page views", value: 3639 },
  { label: "Ticket clicks", value: 812 },
  { label: "Checkout starts", value: 514 },
  { label: "Purchases", value: 427 },
];
const colors = ["#c86549", "#e8a84e", "#377660", "#527d8d", "#8e796b"];

export default async function AnalyticsPage() {
  const [events, snapshot] = await Promise.all([
    getEvents(),
    getAnalyticsSnapshot(),
  ]);
  const sources = snapshot
    ? snapshot.sources.map((source, index) => ({
        ...source,
        name: source.name
          .replaceAll("_", " ")
          .replace(/\b\w/g, (letter) => letter.toUpperCase()),
        color: colors[index % colors.length],
      }))
    : previewSources;
  const funnel = snapshot
    ? [
        { label: "Event page views", value: snapshot.funnel.views },
        { label: "Ticket clicks", value: snapshot.funnel.checkoutStarts },
        { label: "Checkout starts", value: snapshot.funnel.checkoutStarts },
        { label: "Purchases", value: snapshot.funnel.purchases },
      ]
    : previewFunnel;
  const promoters = snapshot
    ? snapshot.promoters
    : [
        { name: "Rico Salazar", tickets: 42, revenue: 1284 },
        { name: "Sofia Ramos", tickets: 28, revenue: 812 },
        { name: "Los Primos Media", tickets: 17, revenue: 492 },
        { name: "Organic / no promoter", tickets: 103, revenue: 2292 },
      ];
  const gross = events.reduce((sum, event) => sum + event.revenue, 0);
  const sold = events.reduce((sum, event) => sum + event.sold, 0);
  const capacity = events.reduce((sum, event) => sum + event.capacity, 0);
  const checkedIn = events.reduce((sum, event) => sum + event.checkedIn, 0);
  const viewCount = funnel[0]?.value ?? 0;
  const purchases = funnel.at(-1)?.value ?? 0;
  const sourceMax = Math.max(1, ...sources.map((source) => source.revenue));
  return (
    <>
      <PageHeader
        eyebrow="Decision-ready numbers"
        title="Did the event make sense?"
        description="Revenue, turnout, conversion, and source performance—built from Oasis activity, not follower counts."
      />
      <div className="data-freshness">
        <span />
        {snapshot
          ? "Live Oasis data · orders, check-ins, and attribution"
          : "Preview data · Connect Supabase for live orders, check-ins, and attribution"}
      </div>
      <section className="analytics-hero-metrics">
        <div className="primary">
          <span>
            <CircleDollarSign />
          </span>
          <div>
            <small>Ticket revenue</small>
            <strong>{currency(gross)}</strong>
            <em>Gross before tracked refunds</em>
          </div>
        </div>
        <div>
          <small>Tickets & RSVPs</small>
          <strong>{sold}</strong>
          <em>Across {events.length} active events</em>
        </div>
        <div>
          <small>Portfolio sell-through</small>
          <strong>{capacity ? Math.round((sold / capacity) * 100) : 0}%</strong>
          <em>{Math.max(0, capacity - sold)} capacity remaining</em>
        </div>
        <div>
          <small>Paid conversion</small>
          <strong>
            {viewCount ? ((purchases / viewCount) * 100).toFixed(1) : "0.0"}%
          </strong>
          <em>
            {purchases} orders / {viewCount} views
          </em>
        </div>
        <div>
          <small>Show rate</small>
          <strong>{sold ? Math.round((checkedIn / sold) * 100) : 0}%</strong>
          <em>Checked in / tickets sold</em>
        </div>
      </section>
      <div className="analytics-grid">
        <section className="panel analytics-card funnel-card">
          <header>
            <div>
              <span className="kicker">Guest journey</span>
              <h2>Where interest becomes a sale</h2>
            </div>
            <span>All active events</span>
          </header>
          <div className="funnel-chart">
            {funnel.map((step, index) => (
              <div key={step.label}>
                <span
                  style={{
                    width: `${viewCount ? (step.value / viewCount) * 100 : 0}%`,
                  }}
                >
                  <strong>{step.value.toLocaleString()}</strong>
                  <small>{step.label}</small>
                </span>
                {index < funnel.length - 1 && (
                  <em>
                    {step.value
                      ? Math.round((funnel[index + 1].value / step.value) * 100)
                      : 0}
                    %
                  </em>
                )}
              </div>
            ))}
          </div>
          <p>
            Ticket pages convert well after checkout begins. The biggest
            opportunity is moving more event viewers to the ticket CTA.
          </p>
        </section>
        <section className="panel analytics-card source-card">
          <header>
            <div>
              <span className="kicker">Source attribution</span>
              <h2>What drove sales</h2>
            </div>
            <span>Revenue</span>
          </header>
          <div className="source-bars">
            {sources.map((source) => (
              <div key={source.name}>
                <span>{source.name}</span>
                <div>
                  <i
                    style={{
                      width: `${(source.revenue / sourceMax) * 100}%`,
                      background: source.color,
                    }}
                  />
                </div>
                <strong>{currency(source.revenue)}</strong>
                <small>{source.tickets} tickets</small>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="event-performance">
        <div className="section-heading">
          <div>
            <h2>Event performance</h2>
            <p>
              Revenue and sell-through side by side, so volume doesn’t hide
              efficiency.
            </p>
          </div>
        </div>
        <div className="event-performance-table panel">
          <header>
            <span>Event</span>
            <span>Revenue</span>
            <span>Sold / capacity</span>
            <span>Sell-through</span>
            <span>Avg. ticket</span>
            <span>Verdict</span>
          </header>
          {events.map((event) => {
            const percent = event.capacity
              ? Math.round((event.sold / event.capacity) * 100)
              : 0;
            return (
              <Link
                href={`/admin/events/${event.id}?tab=Analytics`}
                key={event.id}
              >
                <span>
                  <strong>{event.title}</strong>
                  <small>
                    {event.locationName} · {event.date}
                  </small>
                </span>
                <strong>{currency(event.revenue)}</strong>
                <span>
                  {event.sold} / {event.capacity}
                </span>
                <span className="performance-bar">
                  <i>
                    <b style={{ width: `${percent}%` }} />
                  </i>
                  {percent}%
                </span>
                <span>
                  {event.sold ? currency(event.revenue / event.sold) : "—"}
                </span>
                <em className={percent < 35 ? "watch" : "strong"}>
                  {percent < 35 ? "Still building" : "Worth repeating"}
                </em>
                <ArrowRight />
              </Link>
            );
          })}
        </div>
      </section>
      <div className="analytics-grid lower">
        <section className="panel analytics-card">
          <header>
            <div>
              <span className="kicker">Promoter leaderboard</span>
              <h2>Who brought the room</h2>
            </div>
          </header>
          <div className="leaderboard">
            {promoters.map((person, index) => (
              <div key={person.name}>
                <span>{index + 1}</span>
                <strong>{person.name}</strong>
                <em>{person.tickets} tickets</em>
                <b>{currency(person.revenue)}</b>
              </div>
            ))}
          </div>
        </section>
        <section className="panel economics-note">
          <span>
            <TrendingUp />
          </span>
          <div>
            <span className="kicker">Event economics</span>
            <h2>
              {gross > 0
                ? "Ticket contribution is positive."
                : "Economics will appear after the first sale."}
            </h2>
            <p>
              Current view includes ticket revenue and refunds. Connect POS and
              cost sources later to calculate full venue contribution—Oasis does
              not estimate missing bar, food, staffing, talent, or production
              costs.
            </p>
          </div>
          <small>
            Revenue is gross ticket value after recorded refunds. Show rate is
            checked-in admissions divided by sold tickets and RSVPs.
          </small>
        </section>
      </div>
    </>
  );
}
