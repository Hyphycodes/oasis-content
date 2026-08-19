"use client";

import {
  Check,
  Copy,
  Download,
  LoaderCircle,
  Plus,
  QrCode,
  Search,
  UserRoundPlus,
  UsersRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { guests as demoGuests } from "@/lib/demo-data";
import type { Guest, Promoter } from "@/lib/types";
import { StatusPill } from "@/components/ui";

type ManagedGuest = Guest & { eventId?: string };

export function GuestManager({
  initialGuests = demoGuests,
  initialPromoters = [],
  eventOptions = [],
}: {
  initialGuests?: ManagedGuest[];
  initialPromoters?: Promoter[];
  eventOptions?: { id: string; title: string }[];
}) {
  const [guests, setGuests] = useState(initialGuests);
  const [promoters, setPromoters] = useState(initialPromoters);
  const [open, setOpen] = useState(false);
  const [promoterOpen, setPromoterOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [type, setType] = useState<Guest["type"]>("Guest");
  const [promoterId, setPromoterId] = useState("");
  const [notes, setNotes] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [eventId, setEventId] = useState(eventOptions[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [promoterBusyId, setPromoterBusyId] = useState("");
  const [promoterName, setPromoterName] = useState("");
  const [promoterHandle, setPromoterHandle] = useState("");
  const [promoterEmail, setPromoterEmail] = useState("");
  const [promoterPhone, setPromoterPhone] = useState("");
  const [promoterNotes, setPromoterNotes] = useState("");
  const eventGuests = guests.filter(
    (guest) => !guest.eventId || guest.eventId === eventId,
  );
  const visibleGuests = eventGuests.filter((guest) => {
    const query = search.trim().toLowerCase();
    return (
      !query ||
      guest.name.toLowerCase().includes(query) ||
      guest.type.toLowerCase().includes(query) ||
      guest.promoter?.toLowerCase().includes(query)
    );
  });
  const allocated = eventGuests.reduce(
    (sum, guest) => sum + guest.partySize,
    0,
  );
  const checkedIn = eventGuests.reduce(
    (sum, guest) =>
      sum +
      (guest.checkedInCount ??
        (guest.status === "Checked In" ? guest.partySize : 0)),
    0,
  );

  async function addGuest(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          name,
          email,
          phone,
          partySize,
          type,
          notes,
          promoterId: promoterId || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "The guest could not be added.");
      setGuests((current) => [{ ...data.guest, eventId }, ...current]);
      const eventTitle =
        eventOptions.find((option) => option.id === eventId)?.title ??
        "the event";
      setNotice(
        `${name} +${Math.max(0, partySize - 1)} added to ${eventTitle}${data.mode === "preview" ? " in preview mode" : ""}.`,
      );
      setName("");
      setEmail("");
      setPhone("");
      setPartySize(1);
      setNotes("");
      setPromoterId("");
      setOpen(false);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "The guest could not be added.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function addPromoter(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/promoters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: promoterName,
          email: promoterEmail,
          phone: promoterPhone,
          socialHandle: promoterHandle,
          notes: promoterNotes,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "The promoter could not be added.");
      setPromoters((current) => [...current, data.promoter]);
      setNotice(
        `${promoterName} is ready for event links${data.mode === "preview" ? " in preview mode" : ""}.`,
      );
      setPromoterName("");
      setPromoterHandle("");
      setPromoterEmail("");
      setPromoterPhone("");
      setPromoterNotes("");
      setPromoterOpen(false);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "The promoter could not be added.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function createPromoterLink(promoter: Promoter) {
    if (!eventId) throw new Error("Choose an event first.");
    if (promoter.link && promoter.eventId === eventId) return promoter.link;
    setPromoterBusyId(promoter.id);
    try {
      const response = await fetch("/api/promoters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "link",
          promoterId: promoter.id,
          eventId,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error ?? "The promoter link could not be created.",
        );
      const link = data.link.destinationUrl as string;
      setPromoters((current) =>
        current.map((item) =>
          item.id === promoter.id
            ? {
                ...item,
                link,
                eventId: data.link.eventId,
                code: data.link.code,
              }
            : item,
        ),
      );
      return link;
    } finally {
      setPromoterBusyId("");
    }
  }

  async function copyPromoterLink(promoter: Promoter) {
    setNotice("");
    try {
      const link = await createPromoterLink(promoter);
      await navigator.clipboard.writeText(
        new URL(link, window.location.origin).toString(),
      );
      setNotice(
        `${promoter.name}'s link is copied for ${eventOptions.find((option) => option.id === eventId)?.title ?? "this event"}.`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "The promoter link could not be copied.",
      );
    }
  }

  return (
    <>
      <section className="guest-summary">
        <div>
          <span>
            <UsersRound />
          </span>
          <strong>{allocated}</strong>
          <small>Total allocation</small>
        </div>
        <div>
          <span>
            <Check />
          </span>
          <strong>{checkedIn}</strong>
          <small>Checked in</small>
        </div>
        <div>
          <span>
            <UserRoundPlus />
          </span>
          <strong>{allocated - checkedIn}</strong>
          <small>Still expected</small>
        </div>
      </section>
      {notice && (
        <div className="upload-notice">
          <Check />
          {notice}
        </div>
      )}
      <div className="guest-toolbar">
        <label className="collection-search">
          <Search />
          <input
            placeholder="Search guests"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <select
          value={eventId}
          onChange={(event) => setEventId(event.target.value)}
        >
          {!eventOptions.length && <option value="">No active events</option>}
          {eventOptions.map((option) => (
            <option value={option.id} key={option.id}>
              {option.title}
            </option>
          ))}
        </select>
        <button
          className="button button-primary"
          onClick={() => setOpen(true)}
          disabled={!eventId}
        >
          <Plus />
          Add guest
        </button>
      </div>
      <div className="guest-list panel">
        <div className="guest-list-head">
          <span>Guest</span>
          <span>Party</span>
          <span>Type</span>
          <span>Source</span>
          <span>Status</span>
        </div>
        {visibleGuests.map((guest) => (
          <div className="guest-row" key={guest.id}>
            <span className="guest-person">
              <i>
                {guest.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)}
              </i>
              <span>
                <strong>
                  {guest.name}
                  {guest.partySize > 1 && ` +${guest.partySize - 1}`}
                </strong>
                <small>{guest.note ?? "No note"}</small>
              </span>
            </span>
            <strong>
              {guest.checkedInCount ??
                (guest.status === "Checked In" ? guest.partySize : 0)}
              /{guest.partySize}
            </strong>
            <span>{guest.type}</span>
            <span>{guest.promoter ?? "Oasis"}</span>
            <StatusPill status={guest.status} />
          </div>
        ))}
        {!visibleGuests.length && (
          <div className="collection-empty">
            {search
              ? "No guests match this search."
              : "No guests yet for this event."}
          </div>
        )}
      </div>
      <section className="promoter-section">
        <div className="section-heading">
          <div>
            <h2>Promoters</h2>
            <p>Track the people bringing the room together.</p>
          </div>
          <button
            className="button button-secondary"
            onClick={() => setPromoterOpen(true)}
          >
            <Plus />
            Add promoter
          </button>
        </div>
        <div className="promoter-grid">
          {promoters.map((person, index) => (
            <article className="panel" key={person.name}>
              <span className="promoter-rank">0{index + 1}</span>
              <i>
                {person.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)}
              </i>
              <div>
                <strong>{person.name}</strong>
                <small>{person.handle}</small>
              </div>
              <dl>
                <div>
                  <dt>Visits</dt>
                  <dd>{person.clicks}</dd>
                </div>
                <div>
                  <dt>Orders</dt>
                  <dd>{person.orders}</dd>
                </div>
                <div>
                  <dt>Revenue</dt>
                  <dd>
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    }).format(person.revenue)}
                  </dd>
                </div>
              </dl>
              <div className="promoter-actions">
                <button
                  type="button"
                  onClick={() => copyPromoterLink(person)}
                  disabled={promoterBusyId === person.id || !eventId}
                >
                  {promoterBusyId === person.id ? (
                    <LoaderCircle className="spin" />
                  ) : (
                    <Copy />
                  )}
                  Copy link
                </button>
                {person.link && person.eventId === eventId && (
                  <a
                    href={`/api/qr?value=${encodeURIComponent(person.link)}`}
                    download
                  >
                    <Download />
                    QR
                  </a>
                )}
              </div>
            </article>
          ))}
          {!promoters.length && (
            <div className="collection-empty panel">
              Add a promoter to create trackable event links and QR codes.
            </div>
          )}
        </div>
      </section>
      {open && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setOpen(false);
          }}
        >
          <form className="quick-guest-modal" onSubmit={addGuest}>
            <header>
              <div>
                <span className="kicker">
                  {eventOptions.find((option) => option.id === eventId)
                    ?.title ?? "Oasis event"}
                </span>
                <h2>Add a guest</h2>
                <p>
                  Add the party, contact details, and source the door needs.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <X />
              </button>
            </header>
            <label className="field">
              <span>Name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                autoFocus
                placeholder="Guest name"
              />
            </label>
            <div className="form-grid">
              <label className="field">
                <span>Guests</span>
                <input
                  type="number"
                  value={partySize}
                  min="1"
                  max="20"
                  onChange={(event) => setPartySize(Number(event.target.value))}
                />
              </label>
              <label className="field">
                <span>Type</span>
                <select
                  value={type}
                  onChange={(event) =>
                    setType(event.target.value as Guest["type"])
                  }
                >
                  <option>Guest</option>
                  <option>Owner Guest</option>
                  <option>Comp</option>
                  <option>Influencer</option>
                  <option>Promoter</option>
                  <option>Artist</option>
                  <option>Staff</option>
                  <option>Partner</option>
                  <option>VIP</option>
                  <option>Other</option>
                </select>
              </label>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>
                  Email <i>optional</i>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="guest@example.com"
                />
              </label>
              <label className="field">
                <span>
                  Phone <i>optional</i>
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="(817) 555-0100"
                />
              </label>
            </div>
            {!!promoters.length && (
              <label className="field">
                <span>
                  Promoter attribution <i>optional</i>
                </span>
                <select
                  value={promoterId}
                  onChange={(event) => setPromoterId(event.target.value)}
                >
                  <option value="">Oasis / direct</option>
                  {promoters.map((promoter) => (
                    <option value={promoter.id} key={promoter.id}>
                      {promoter.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="field">
              <span>
                Note <i>optional</i>
              </span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Birthday, host, special arrival…"
              />
            </label>
            <button className="button button-primary" disabled={busy}>
              {busy ? <LoaderCircle className="spin" /> : <Check />}Add to guest
              list
            </button>
          </form>
        </div>
      )}
      {promoterOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setPromoterOpen(false);
          }}
        >
          <form className="quick-guest-modal" onSubmit={addPromoter}>
            <header>
              <div>
                <span className="kicker">Referral partner</span>
                <h2>Add a promoter</h2>
                <p>Create trackable links and QR codes for every event.</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setPromoterOpen(false)}
              >
                <X />
              </button>
            </header>
            <label className="field">
              <span>Name</span>
              <input
                value={promoterName}
                onChange={(event) => setPromoterName(event.target.value)}
                required
                autoFocus
                placeholder="Promoter or collective"
              />
            </label>
            <div className="form-grid">
              <label className="field">
                <span>
                  Social handle <i>optional</i>
                </span>
                <input
                  value={promoterHandle}
                  onChange={(event) => setPromoterHandle(event.target.value)}
                  placeholder="@handle"
                />
              </label>
              <label className="field">
                <span>
                  Email <i>optional</i>
                </span>
                <input
                  type="email"
                  value={promoterEmail}
                  onChange={(event) => setPromoterEmail(event.target.value)}
                  placeholder="name@example.com"
                />
              </label>
            </div>
            <label className="field">
              <span>
                Phone <i>optional</i>
              </span>
              <input
                type="tel"
                value={promoterPhone}
                onChange={(event) => setPromoterPhone(event.target.value)}
                placeholder="(817) 555-0100"
              />
            </label>
            <label className="field">
              <span>
                Notes <i>optional</i>
              </span>
              <textarea
                rows={3}
                value={promoterNotes}
                onChange={(event) => setPromoterNotes(event.target.value)}
                placeholder="Audience, rate, comp agreement…"
              />
            </label>
            <button className="button button-primary" disabled={busy}>
              {busy ? <LoaderCircle className="spin" /> : <QrCode />}
              Add promoter
            </button>
          </form>
        </div>
      )}
    </>
  );
}
