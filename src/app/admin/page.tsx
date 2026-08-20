import { ArrowRight, CalendarPlus, QrCode, Ticket, TrendingUp, UsersRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AttentionCard, PageHeader, SectionHeader, StatusPill } from "@/components/ui";
import { EventCard } from "@/components/event-card";
import { getContentItems, getCurrentProfile, getEvents } from "@/lib/data";
import { currency, formatEventDate } from "@/lib/demo-data";
import { getWorkspaceMode } from "@/lib/env";

export default async function TodayPage() {
  const [allEvents, contentItems, profile] = await Promise.all([getEvents(), getContentItems(), getCurrentProfile()]);
  const events = allEvents.filter((event) => event.status !== "Draft");
  const tonight = events[0];
  const isPreview = getWorkspaceMode() === "preview";
  const dateLabel = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/Chicago" }).format(new Date());
  return (
    <>
      <PageHeader
        eyebrow={dateLabel}
        title={`Good afternoon, ${profile.name.split(" ")[0]}.`}
        description={tonight ? `${tonight.title} is the next event. Everything the team needs is gathered here.` : "Create the first event and Oasis will organize the work from here."}
        actions={<Link className="button button-primary" href="/admin/events/new"><CalendarPlus size={18} />Create event</Link>}
      />

      {tonight ? <section className="tonight-card">
        <div className="tonight-image"><Image src={tonight.imageUrl} alt={tonight.imageAlt} fill sizes="(max-width: 900px) 100vw, 45vw" priority /></div>
        <div className="tonight-content">
          <div className="tonight-top"><div><span className="kicker">Friday night</span><StatusPill status="On Sale" /></div><span className="tonight-date">{formatEventDate(tonight.date)}</span></div>
          <div><span className="eyebrow">{tonight.eyebrow}</span><h2>{tonight.title}</h2><p>{tonight.locationName} · Doors {tonight.doorsAt}</p></div>
          <div className="tonight-metrics">
            <div><Ticket /><strong>{tonight.sold}</strong><span>tickets sold</span></div>
            <div><UsersRound /><strong>{tonight.capacity - tonight.sold}</strong><span>spots left</span></div>
            <div><TrendingUp /><strong>{currency(tonight.revenue)}</strong><span>gross sales</span></div>
          </div>
          <div className="tonight-actions"><Link className="button button-light" href={`/admin/events/${tonight.id}`}>Open event<ArrowRight size={16} /></Link><Link className="button button-ghost-light" href="/check-in"><QrCode size={17} />Open check-in</Link></div>
        </div>
      </section> : <section className="panel dashboard-empty"><CalendarPlus /><span className="kicker">Ready when you are</span><h2>Create the first Oasis event.</h2><p>Add the flyer and essentials once; tickets, pages, links, campaigns, and archive all follow that event.</p><Link className="button button-primary" href="/admin/events/new">Create event</Link></section>}

      <div className="dashboard-grid">
        <section>
          <SectionHeader title="Coming up" description="Your next few moments at Oasis." href="/admin/events" />
          <div className="event-grid event-grid-small">{events.slice(tonight ? 1 : 0, tonight ? 4 : 3).map((event) => <EventCard key={event.id} event={event} compact />)}{!events.length ? <p className="empty-inline">Upcoming events will appear here after they are published.</p> : null}</div>
        </section>
        <aside>
          <SectionHeader title="Needs attention" description="Only the things that need a person." />
          <div className="attention-list">{isPreview ? (
            <AttentionCard
              title="Development preview only"
              copy="These sample events are not Oasis business records. Saves, payments, emails, and provider publishing are simulated here."
              href="/admin/settings"
              action="Review setup"
            />
          ) : <p className="empty-inline">Connection and publishing issues will appear here.</p>}</div>
        </aside>
      </div>

      <section className="scheduled-section">
        <SectionHeader title="Scheduled content" description="The next messages your guests will see." href="/admin/content" />
        <div className="schedule-list">
          {contentItems.map((item) => (
            <Link href="/admin/content" className="schedule-row" key={item.id}>
              <Image src={item.imageUrl} alt="" width={52} height={52} />
              <span className="schedule-copy"><strong>{item.title}</strong><small>{item.channel}</small></span>
              <span className="schedule-time">{item.scheduledFor}</span>
              <StatusPill status={item.status} />
              <ArrowRight size={16} />
            </Link>
          ))}{!contentItems.length ? <p className="empty-inline">No scheduled content yet.</p> : null}
        </div>
      </section>
    </>
  );
}
