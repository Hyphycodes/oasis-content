"use client";

import Link from "next/link";

export function TrackedLink({ href, eventId, source = "oasis_links", className, children }: { href: string; eventId?: string; source?: string; className?: string; children: React.ReactNode }) {
  function track() {
    let visitorId = window.localStorage.getItem("oasis-visitor-id");
    if (!visitorId) { visitorId = crypto.randomUUID(); window.localStorage.setItem("oasis-visitor-id", visitorId); }
    navigator.sendBeacon?.("/api/track", new Blob([JSON.stringify({ eventName: "link_click", visitorId, oasisEventId: eventId, source, path: href, referrer: document.referrer, properties: { utm_source: new URLSearchParams(window.location.search).get("utm_source") } })], { type: "application/json" }));
  }
  return <Link className={className} href={href} onClick={track}>{children}</Link>;
}
