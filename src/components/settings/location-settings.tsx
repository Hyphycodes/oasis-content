"use client";

import {
  Check,
  ChevronRight,
  LoaderCircle,
  MapPin,
  Plus,
  Save,
  X,
} from "lucide-react";
import { useState } from "react";

export type SettingsLocation = {
  id: string;
  name: string;
  address: string;
  phone: string;
  timezone: string;
  hours: string;
};
const blank = {
  id: "",
  name: "",
  address: "",
  phone: "",
  timezone: "America/Chicago",
  hours: "Hours managed in Settings",
};

export function LocationSettings({
  initialLocations,
}: {
  initialLocations: SettingsLocation[];
}) {
  const [locations, setLocations] = useState(initialLocations);
  const [editing, setEditing] = useState<SettingsLocation | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "The location could not be saved.");
      setLocations((current) =>
        current.some((location) => location.id === data.location.id)
          ? current.map((location) =>
              location.id === data.location.id ? data.location : location,
            )
          : [...current, data.location],
      );
      setEditing(null);
      setNotice(
        `${data.location.name} saved${data.mode === "preview" ? " in preview mode" : ""}.`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "The location could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings-section">
      <header>
        <span className="kicker">Locations</span>
        <h2>Built for every Oasis</h2>
        <p>
          Addresses, hours, profiles, and defaults stay mapped to the right
          place.
        </p>
      </header>
      {notice ? (
        <div className="upload-notice" role="status">
          <Check />
          {notice}
        </div>
      ) : null}
      <div className="location-settings-list">
        {locations.map((location, index) => (
          <article className="panel" key={location.id}>
            <span className="location-index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <strong>{location.name}</strong>
              <small>{location.address}</small>
              <span>{location.hours}</span>
            </div>
            <span className="integration-state connected">
              <Check />
              Active
            </span>
            <button type="button" onClick={() => setEditing(location)}>
              Manage
              <ChevronRight />
            </button>
          </article>
        ))}
        {!locations.length ? (
          <div className="panel locations-empty">
            <MapPin />
            <strong>No locations yet</strong>
            <small>
              Add the first verified Oasis address to begin creating events.
            </small>
          </div>
        ) : null}
      </div>
      <button
        className="button button-secondary"
        onClick={() => setEditing(blank)}
      >
        <Plus />
        Add location
      </button>
      {editing ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditing(null);
          }}
        >
          <form
            className="location-modal panel"
            onSubmit={save}
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-title"
          >
            <header>
              <div>
                <span className="kicker">Owner / Admin</span>
                <h2 id="location-title">
                  {editing.id ? "Manage location" : "Add a location"}
                </h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setEditing(null)}
                aria-label="Close location settings"
              >
                <X />
              </button>
            </header>
            <label className="field">
              <span>Location name</span>
              <input
                required
                value={editing.name}
                onChange={(event) =>
                  setEditing({ ...editing, name: event.target.value })
                }
                placeholder="Oasis Lockport"
              />
            </label>
            <label className="field">
              <span>Verified address</span>
              <textarea
                required
                rows={2}
                value={editing.address}
                onChange={(event) =>
                  setEditing({ ...editing, address: event.target.value })
                }
              />
            </label>
            <div className="form-grid">
              <label className="field field-wide">
                <span>Phone</span>
                <input
                  value={editing.phone}
                  onChange={(event) =>
                    setEditing({ ...editing, phone: event.target.value })
                  }
                />
              </label>
              <label className="field field-wide">
                <span>Timezone</span>
                <select
                  value={editing.timezone}
                  onChange={(event) =>
                    setEditing({ ...editing, timezone: event.target.value })
                  }
                >
                  <option>America/Chicago</option>
                  <option>America/New_York</option>
                  <option>America/Denver</option>
                  <option>America/Los_Angeles</option>
                </select>
              </label>
            </div>
            <label className="field">
              <span>Public hours</span>
              <input
                required
                value={editing.hours}
                onChange={(event) =>
                  setEditing({ ...editing, hours: event.target.value })
                }
                placeholder="Tue–Sun · 11am–2am"
              />
            </label>
            <footer>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button className="button button-primary" disabled={busy}>
                {busy ? <LoaderCircle className="spin" /> : <Save />}Save
                location
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </div>
  );
}
