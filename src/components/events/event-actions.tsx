"use client";

import { Ban, Copy, LoaderCircle, MoreHorizontal, Pencil } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function EventActions({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"duplicate" | "cancel" | null>(null);
  const [error, setError] = useState("");

  async function run(action: "duplicate" | "cancel") {
    if (action === "cancel" && !window.confirm(`Cancel ${eventTitle}? Ticket sales will stop and future campaign posts will be disabled.`)) return;
    setBusy(action);
    setError("");
    try {
      const response = await fetch(`/api/events/${eventId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The event could not be updated.");
      if (action === "duplicate") router.push(`/admin/events/${data.event.id}?created=draft`);
      else router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The event could not be updated.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="event-actions">
      <Link className="button button-primary" href={`/admin/events/${eventId}/edit`}><Pencil size={16} />Edit event</Link>
      <details className="event-action-menu">
        <summary className="icon-button" aria-label="More event actions"><MoreHorizontal /></summary>
        <div>
          <button type="button" onClick={() => run("duplicate")} disabled={busy !== null}>{busy === "duplicate" ? <LoaderCircle className="spin" /> : <Copy />}Duplicate event</button>
          <button type="button" className="danger" onClick={() => run("cancel")} disabled={busy !== null}>{busy === "cancel" ? <LoaderCircle className="spin" /> : <Ban />}Cancel event</button>
        </div>
      </details>
      {error ? <span className="event-action-error" role="alert">{error}</span> : null}
    </div>
  );
}
