"use client";

import { CalendarPlus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EventCard } from "@/components/event-card";
import type { OasisEvent } from "@/lib/types";

type View = "upcoming" | "drafts" | "past";

export function EventCollection({ events }: { events: OasisEvent[] }) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>("upcoming");
  const today = new Date().toISOString().slice(0, 10);
  const counts = {
    upcoming: events.filter(
      (event) => event.status !== "Draft" && event.date >= today,
    ).length,
    drafts: events.filter((event) => event.status === "Draft").length,
    past: events.filter((event) => event.date < today).length,
  };
  const visibleEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return events.filter((event) => {
      const matchesSearch =
        !query ||
        [event.title, event.locationName, event.description]
          .join(" ")
          .toLowerCase()
          .includes(query);
      if (!matchesSearch) return false;
      if (view === "drafts") return event.status === "Draft";
      if (view === "past") return event.date < today;
      return event.status !== "Draft" && event.date >= today;
    });
  }, [events, search, today, view]);

  return (
    <>
      <div className="collection-toolbar">
        <label className="collection-search">
          <Search size={17} />
          <input
            aria-label="Search events"
            placeholder="Search events"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="segmented-control" aria-label="Filter events">
          {(
            [
              ["upcoming", "Upcoming"],
              ["drafts", "Drafts"],
              ["past", "Past"],
            ] as const
          ).map(([key, label]) => (
            <button
              type="button"
              className={view === key ? "active" : ""}
              onClick={() => setView(key)}
              key={key}
            >
              {label} <span>{counts[key]}</span>
            </button>
          ))}
        </div>
      </div>
      {visibleEvents.length ? (
        <div className="event-grid event-collection">
          {visibleEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <section className="panel collection-empty">
          <CalendarPlus />
          <h2>
            {search ? "No events match this search." : `No ${view} events.`}
          </h2>
          <p>Change the view or start a new Oasis event.</p>
          <Link className="button button-primary" href="/admin/events/new">
            Create event
          </Link>
        </section>
      )}
    </>
  );
}
