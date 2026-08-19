import { ArrowUpRight, MapPin, Ticket } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { currency, formatEventDate } from "@/lib/demo-data";
import type { OasisEvent } from "@/lib/types";
import { StatusPill } from "@/components/ui";

export function EventCard({ event, compact = false }: { event: OasisEvent; compact?: boolean }) {
  const fill = Math.min(100, Math.round((event.sold / event.capacity) * 100));
  return (
    <Link className={`event-card ${compact ? "event-card-compact" : ""}`} href={`/admin/events/${event.id}`}>
      <div className="event-image">
        <Image src={event.imageUrl} alt={event.imageAlt} fill sizes={compact ? "(max-width: 800px) 50vw, 240px" : "(max-width: 800px) 100vw, 33vw"} />
        <div className="date-tile"><strong>{formatEventDate(event.date, "short").split(" ")[1]}</strong><span>{formatEventDate(event.date, "short").split(" ")[0]}</span></div>
        <StatusPill status={event.status} />
      </div>
      <div className="event-card-body">
        <div className="event-title-line"><div><span className="eyebrow">{event.eyebrow}</span><h3>{event.title}</h3></div><ArrowUpRight size={19} /></div>
        <p className="event-meta"><MapPin size={14} />{event.locationName} · {event.startsAt}</p>
        <div className="sales-progress"><span style={{ width: `${fill}%` }} /></div>
        <div className="event-stats"><span><Ticket size={14} />{event.sold} / {event.capacity}</span><strong>{currency(event.revenue)}</strong></div>
      </div>
    </Link>
  );
}
