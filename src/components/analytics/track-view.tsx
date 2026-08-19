"use client";

import { useEffect } from "react";

export function TrackView({
  eventName,
  eventId,
  source = "website",
}: {
  eventName: "page_view" | "event_view" | "checkout_start";
  eventId?: string;
  source?: string;
}) {
  useEffect(() => {
    let visitorId = window.localStorage.getItem("oasis-visitor-id");
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      window.localStorage.setItem("oasis-visitor-id", visitorId);
    }
    const parameters = new URLSearchParams(window.location.search);
    const promoterCode = parameters.get("ref");
    const payload = JSON.stringify({
      eventName,
      visitorId,
      oasisEventId: eventId,
      source: promoterCode
        ? "promoter"
        : (parameters.get("utm_source") ?? source),
      path: `${window.location.pathname}${window.location.search}`,
      referrer: document.referrer,
      properties: {
        utm_medium: parameters.get("utm_medium"),
        utm_campaign: parameters.get("utm_campaign"),
        promoter_code: promoterCode,
      },
    });
    const blob = new Blob([payload], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/track", blob))
      void fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      });
  }, [eventId, eventName, source]);

  return null;
}
