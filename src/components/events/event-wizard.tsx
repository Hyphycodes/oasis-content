"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  CloudUpload,
  Disc3,
  Globe2,
  ImagePlus,
  Link2,
  LoaderCircle,
  MapPin,
  Music2,
  Palette,
  PartyPopper,
  Sparkles,
  Sun,
  Ticket,
  Tv,
  Upload,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { eventTemplates, locations as demoLocations } from "@/lib/demo-data";

type TicketMode = "ticketed" | "rsvp" | "none";
type DraftTicketType = {
  id?: string;
  name: string;
  price: string;
  capacity: string;
};
type Draft = {
  title: string;
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
  template: string;
  description: string;
  ageRestriction: string;
  ticketMode: TicketMode;
  price: string;
  capacity: string;
  ticketTypes: DraftTicketType[];
  destinations: string[];
};

export type EventWizardInitial = {
  id: string;
  heroImageUrl?: string;
  draft: Partial<Draft>;
};

const iconMap = { Disc3, Music2, Sun, Palette, Tv, Sparkles };
const defaultDraft: Draft = {
  title: "",
  locationId: demoLocations[0].id,
  date: "2026-09-12",
  startTime: "20:00",
  endTime: "00:30",
  template: "DJ Night",
  description: "",
  ageRestriction: "21+",
  ticketMode: "ticketed",
  price: "18",
  capacity: "220",
  ticketTypes: [{ name: "General admission", price: "18", capacity: "220" }],
  destinations: [
    "Website",
    "Tickets",
    "Oasis Links",
    "Google Drive",
    "Instagram",
    "Facebook",
    "Google",
  ],
};

const steps = [
  { label: "Creative", icon: ImagePlus },
  { label: "Basics", icon: CalendarDays },
  { label: "Tickets", icon: Ticket },
  { label: "Publish", icon: PartyPopper },
];

type LocationOption = {
  id: string;
  name: string;
  address: string;
  timezone: string;
};

export function EventWizard({
  initialEvent,
  locationOptions = demoLocations,
}: {
  initialEvent?: EventWizardInitial;
  locationOptions?: LocationOption[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>(() => {
    if (initialEvent) {
      const merged = {
        ...defaultDraft,
        locationId: locationOptions[0]?.id ?? "",
        ...initialEvent.draft,
      };
      if (!initialEvent.draft.ticketTypes)
        merged.ticketTypes = [
          {
            name: merged.ticketMode === "rsvp" ? "RSVP" : "General admission",
            price: merged.ticketMode === "rsvp" ? "0" : merged.price,
            capacity: merged.capacity,
          },
        ];
      return merged;
    }
    if (typeof window === "undefined")
      return { ...defaultDraft, locationId: locationOptions[0]?.id ?? "" };
    const savedDraft = window.localStorage.getItem("oasis-event-draft");
    if (!savedDraft)
      return { ...defaultDraft, locationId: locationOptions[0]?.id ?? "" };
    try {
      const stored = JSON.parse(savedDraft) as Partial<Draft>;
      const locationId = locationOptions.some(
        (location) => location.id === stored.locationId,
      )
        ? stored.locationId!
        : (locationOptions[0]?.id ?? "");
      return { ...defaultDraft, ...stored, locationId };
    } catch {
      window.localStorage.removeItem("oasis-event-draft");
      return { ...defaultDraft, locationId: locationOptions[0]?.id ?? "" };
    }
  });
  const [preview, setPreview] = useState(initialEvent?.heroImageUrl ?? "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.localStorage.setItem("oasis-event-draft", JSON.stringify(draft));
      setSaved(true);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [draft]);

  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const location =
    locationOptions.find((item) => item.id === draft.locationId) ??
    locationOptions[0] ??
    demoLocations[0];
  const generatedTitle = draft.title || "Your event name";
  const generatedDescription =
    draft.description ||
    `Join us at ${location.name} for a special night made for the Oasis community.`;
  const imageSrc =
    preview ||
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=85";
  const progress = `${step * 25}%`;

  function update<Key extends keyof Draft>(key: Key, value: Draft[Key]) {
    setSaved(false);
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function chooseTemplate(name: string) {
    setSaved(false);
    const defaults: Record<string, Partial<Draft>> = {
      "DJ Night": {
        template: name,
        ticketMode: "ticketed",
        price: "18",
        capacity: "220",
        ageRestriction: "21+",
        startTime: "20:00",
        endTime: "00:30",
      },
      "Banda Saturday": {
        template: name,
        ticketMode: "ticketed",
        price: "25",
        capacity: "250",
        ageRestriction: "18+",
        startTime: "19:30",
        endTime: "00:30",
      },
      Brunch: {
        template: name,
        ticketMode: "rsvp",
        price: "0",
        capacity: "110",
        ageRestriction: "All ages",
        startTime: "11:00",
        endTime: "16:00",
      },
      "Paint & Sip": {
        template: name,
        ticketMode: "ticketed",
        price: "38",
        capacity: "42",
        ageRestriction: "21+",
        startTime: "18:30",
        endTime: "21:00",
      },
      "Watch Party": {
        template: name,
        ticketMode: "none",
        price: "0",
        capacity: "160",
        ageRestriction: "All ages",
        startTime: "18:00",
        endTime: "22:00",
      },
      "Start Fresh": { template: name },
    };
    setDraft((current) => {
      const next = { ...current, ...defaults[name] };
      return {
        ...next,
        ticketTypes:
          next.ticketMode === "none"
            ? []
            : [
                {
                  name:
                    next.ticketMode === "rsvp" ? "RSVP" : "General admission",
                  price: next.ticketMode === "rsvp" ? "0" : next.price,
                  capacity: next.capacity,
                },
              ],
      };
    });
  }

  function chooseTicketMode(ticketMode: TicketMode) {
    update("ticketMode", ticketMode);
    if (ticketMode === "none") update("ticketTypes", []);
    else if (!draft.ticketTypes.length)
      update("ticketTypes", [
        {
          name: ticketMode === "rsvp" ? "RSVP" : "General admission",
          price: ticketMode === "rsvp" ? "0" : draft.price,
          capacity: draft.capacity,
        },
      ]);
    else if (ticketMode === "rsvp")
      update("ticketTypes", [
        {
          ...draft.ticketTypes[0],
          name: "RSVP",
          price: "0",
        },
      ]);
    else if (ticketMode === "ticketed" && draft.ticketTypes[0]?.name === "RSVP")
      update("ticketTypes", [
        {
          ...draft.ticketTypes[0],
          name: "General admission",
          price: draft.price,
        },
      ]);
  }

  function updateTicketType(
    index: number,
    key: keyof DraftTicketType,
    value: string,
  ) {
    update(
      "ticketTypes",
      draft.ticketTypes.map((ticket, ticketIndex) =>
        ticketIndex === index ? { ...ticket, [key]: value } : ticket,
      ),
    );
  }

  function addTicketType() {
    update("ticketTypes", [
      ...draft.ticketTypes,
      {
        name: `Ticket type ${draft.ticketTypes.length + 1}`,
        price: draft.price,
        capacity: draft.capacity,
      },
    ]);
  }

  function handleFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setError("Choose an image or video file.");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError("That file is larger than 100 MB. Choose a smaller version.");
      return;
    }
    setError("");
    setFileName(file.name);
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  }

  function canContinue() {
    if (step === 2)
      return Boolean(
        draft.title.trim() && draft.date && draft.startTime && draft.endTime,
      );
    if (step === 3 && draft.ticketMode !== "none")
      return (
        draft.ticketTypes.length > 0 &&
        draft.ticketTypes.every(
          (ticket) =>
            ticket.name.trim().length > 1 &&
            Number(ticket.capacity) > 0 &&
            (draft.ticketMode === "rsvp" || Number(ticket.price) >= 0),
        )
      );
    if (step === 4)
      return draft.destinations.some(
        (destination) =>
          destination !== "Tickets" || draft.ticketMode !== "none",
      );
    return true;
  }

  async function submit(mode: "draft" | "publish") {
    setSaving(true);
    setError("");
    try {
      let heroImageUrl = preview.startsWith("blob:")
        ? undefined
        : preview || imageSrc;
      if (selectedFile) {
        const media = new FormData();
        media.set("file", selectedFile);
        media.set("category", "event-creative");
        const uploadResponse = await fetch("/api/media", {
          method: "POST",
          body: media,
        });
        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok)
          throw new Error(
            uploadResult.error ?? "The flyer could not be uploaded.",
          );
        heroImageUrl =
          uploadResult.asset?.public_url ??
          uploadResult.asset?.publicUrl ??
          heroImageUrl;
      }
      const response = await fetch(
        initialEvent ? `/api/events/${initialEvent.id}` : "/api/events",
        {
          method: initialEvent ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...draft,
            price: Number(draft.ticketTypes[0]?.price ?? draft.price),
            capacity:
              draft.ticketMode === "none"
                ? Number(draft.capacity)
                : draft.ticketTypes.reduce(
                    (sum, ticket) => sum + Number(ticket.capacity || 0),
                    0,
                  ),
            ticketTypes: draft.ticketTypes.map((ticket) => ({
              ...ticket,
              price: draft.ticketMode === "rsvp" ? 0 : Number(ticket.price),
              capacity: Number(ticket.capacity),
            })),
            publish: mode === "publish",
            heroImageUrl,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "The event could not be saved.");
      let publishing = "";
      if (mode === "publish") {
        const destinationMap: Record<string, string> = {
          Website: "website",
          Tickets: "tickets",
          "Oasis Links": "oasis_links",
          "Google Drive": "google_drive",
          Instagram: "instagram",
          Facebook: "facebook",
          Google: "google_business",
        };
        const destinations = draft.destinations
          .filter(
            (destination) =>
              destination !== "Tickets" || draft.ticketMode !== "none",
          )
          .map((destination) => destinationMap[destination])
          .filter(Boolean);
        const publishResponse = await fetch("/api/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId: result.event.id, destinations }),
        });
        publishing = publishResponse.ok ? "queued" : "attention";
      }
      window.localStorage.removeItem("oasis-event-draft");
      router.push(
        `/admin/events/${result.event.id}?created=${initialEvent ? "updated" : mode}${publishing ? `&publishing=${publishing}` : ""}`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The event could not be saved.",
      );
      setSaving(false);
    }
  }

  return (
    <div className="event-wizard">
      <header className="wizard-header">
        <Link href="/admin/events" className="wizard-back">
          <ArrowLeft size={18} />
          Events
        </Link>
        <div className="autosave">
          <span className={saved ? "saved" : "saving"} />
          {saved ? "Draft saved" : "Saving…"}
        </div>
      </header>
      <div className="wizard-progress">
        <span style={{ width: progress }} />
      </div>
      <div className="wizard-layout">
        <aside className="wizard-steps">
          <span className="kicker">
            {initialEvent ? "Edit event" : "Create an event"}
          </span>
          <h1>{generatedTitle}</h1>
          <ol>
            {steps.map(({ label, icon: Icon }, index) => {
              const number = index + 1;
              return (
                <li
                  className={
                    step === number ? "active" : step > number ? "complete" : ""
                  }
                  key={label}
                >
                  <span>{step > number ? <Check size={14} /> : number}</span>
                  <Icon size={18} />
                  <strong>{label}</strong>
                </li>
              );
            })}
          </ol>
        </aside>

        <section className="wizard-stage">
          {step === 1 && (
            <div className="wizard-step">
              <div className="step-copy">
                <span className="step-number">Step 1 of 4</span>
                <h2>Add your flyer or video</h2>
                <p>
                  Use your finished creative now, or skip it and come back
                  before you publish.
                </p>
              </div>
              <label
                className={`drop-zone ${preview ? "has-preview" : ""}`}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  handleFile(event.dataTransfer.files[0]);
                }}
              >
                {preview ? (
                  <>
                    <Image
                      src={preview}
                      alt="Event creative preview"
                      fill
                      unoptimized
                      sizes="(max-width: 800px) 100vw, 55vw"
                    />
                    <span className="replace-overlay">
                      <Upload size={17} />
                      Replace creative
                    </span>
                  </>
                ) : (
                  <div>
                    <span className="upload-icon">
                      <CloudUpload />
                    </span>
                    <strong>Drop your flyer or video here</strong>
                    <p>or choose from your phone or computer</p>
                    <span className="button button-secondary">
                      Choose a file
                    </span>
                    <small>JPG, PNG, WEBP, MP4 or MOV · up to 100 MB</small>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*,video/mp4,video/quicktime"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                />
              </label>
              {fileName && (
                <p className="file-confirmation">
                  <Check size={15} />
                  {fileName} is ready
                </p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="wizard-step">
              <div className="step-copy">
                <span className="step-number">Step 2 of 4</span>
                <h2>Tell us the basics</h2>
                <p>
                  Pick a familiar event type and we’ll fill in the usual
                  details.
                </p>
              </div>
              <fieldset className="template-picker">
                <legend>Start with a template</legend>
                <div>
                  {eventTemplates.map((template) => {
                    const Icon =
                      iconMap[template.icon as keyof typeof iconMap] ??
                      Sparkles;
                    return (
                      <button
                        type="button"
                        className={
                          draft.template === template.name ? "selected" : ""
                        }
                        onClick={() => chooseTemplate(template.name)}
                        key={template.name}
                      >
                        <Icon size={18} />
                        <strong>{template.name}</strong>
                        <small>
                          {template.duration} · {template.ticket}
                        </small>
                        {draft.template === template.name && (
                          <Check size={15} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div className="form-grid">
                <label className="field field-wide">
                  <span>Event name</span>
                  <input
                    value={draft.title}
                    onChange={(event) => update("title", event.target.value)}
                    placeholder="e.g. Noche de Cumbia"
                    autoFocus
                  />
                </label>
                <label className="field field-wide">
                  <span>Location</span>
                  <select
                    value={draft.locationId}
                    onChange={(event) =>
                      update("locationId", event.target.value)
                    }
                    disabled={!locationOptions.length}
                  >
                    {locationOptions.map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={15} />
                  {!locationOptions.length ? (
                    <small>
                      Add an active location in Owner Settings before creating
                      an event.
                    </small>
                  ) : null}
                </label>
                <label className="field">
                  <span>Date</span>
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(event) => update("date", event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Starts</span>
                  <input
                    type="time"
                    value={draft.startTime}
                    onChange={(event) =>
                      update("startTime", event.target.value)
                    }
                  />
                </label>
                <label className="field">
                  <span>Ends</span>
                  <input
                    type="time"
                    value={draft.endTime}
                    onChange={(event) => update("endTime", event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Age rule</span>
                  <select
                    value={draft.ageRestriction}
                    onChange={(event) =>
                      update("ageRestriction", event.target.value)
                    }
                  >
                    <option>All ages</option>
                    <option>18+</option>
                    <option>21+</option>
                  </select>
                  <ChevronDown size={15} />
                </label>
                <label className="field field-wide">
                  <span>Short description</span>
                  <textarea
                    value={draft.description}
                    onChange={(event) =>
                      update("description", event.target.value)
                    }
                    placeholder="What should guests know about this event?"
                    rows={4}
                  />
                  <small>{draft.description.length}/300</small>
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="wizard-step">
              <div className="step-copy">
                <span className="step-number">Step 3 of 4</span>
                <h2>How should guests join?</h2>
                <p>
                  Choose the simplest option and add every tier guests should be
                  able to buy.
                </p>
              </div>
              <div className="mode-picker">
                <button
                  type="button"
                  className={draft.ticketMode === "ticketed" ? "selected" : ""}
                  onClick={() => chooseTicketMode("ticketed")}
                >
                  <span>
                    <Ticket />
                  </span>
                  <strong>Sell tickets</strong>
                  <small>Collect payment and send Oasis tickets.</small>
                  {draft.ticketMode === "ticketed" && <Check />}
                </button>
                <button
                  type="button"
                  className={draft.ticketMode === "rsvp" ? "selected" : ""}
                  onClick={() => chooseTicketMode("rsvp")}
                >
                  <span>
                    <UsersRound />
                  </span>
                  <strong>Free RSVP</strong>
                  <small>Build a guest list without payment.</small>
                  {draft.ticketMode === "rsvp" && <Check />}
                </button>
                <button
                  type="button"
                  className={draft.ticketMode === "none" ? "selected" : ""}
                  onClick={() => chooseTicketMode("none")}
                >
                  <span>
                    <Globe2 />
                  </span>
                  <strong>No registration</strong>
                  <small>Publish information only. Everyone is welcome.</small>
                  {draft.ticketMode === "none" && <Check />}
                </button>
              </div>
              {draft.ticketMode !== "none" && (
                <div className="ticket-setup panel">
                  <div>
                    <span className="ticket-icon">
                      <Ticket />
                    </span>
                    <div>
                      <span className="kicker">
                        {draft.ticketMode === "ticketed"
                          ? `${draft.ticketTypes.length} ticket ${draft.ticketTypes.length === 1 ? "type" : "types"}`
                          : "Free RSVP"}
                      </span>
                      <h3>
                        {draft.ticketMode === "ticketed"
                          ? "Tickets and capacity"
                          : "Reserve a spot"}
                      </h3>
                    </div>
                  </div>
                  {draft.ticketTypes.map((ticket, index) => (
                    <div
                      className="ticket-fields ticket-type-fields"
                      key={ticket.id ?? `new-${index}`}
                    >
                      <label className="field">
                        <span>Ticket name</span>
                        <input
                          value={ticket.name}
                          onChange={(event) =>
                            updateTicketType(index, "name", event.target.value)
                          }
                        />
                      </label>
                      {draft.ticketMode === "ticketed" && (
                        <label className="field">
                          <span>Price</span>
                          <div className="input-prefix">
                            <span>$</span>
                            <input
                              type="number"
                              min="0"
                              value={ticket.price}
                              onChange={(event) =>
                                updateTicketType(
                                  index,
                                  "price",
                                  event.target.value,
                                )
                              }
                            />
                          </div>
                        </label>
                      )}
                      <label className="field">
                        <span>Capacity</span>
                        <input
                          type="number"
                          min="1"
                          value={ticket.capacity}
                          onChange={(event) =>
                            updateTicketType(
                              index,
                              "capacity",
                              event.target.value,
                            )
                          }
                        />
                      </label>
                      {draft.ticketMode === "ticketed" &&
                        draft.ticketTypes.length > 1 && (
                          <button
                            type="button"
                            className="ticket-type-remove"
                            onClick={() =>
                              update(
                                "ticketTypes",
                                draft.ticketTypes.filter(
                                  (_, ticketIndex) => ticketIndex !== index,
                                ),
                              )
                            }
                          >
                            Remove
                          </button>
                        )}
                    </div>
                  ))}
                  {draft.ticketMode === "ticketed" && (
                    <button
                      type="button"
                      className="text-button"
                      onClick={addTicketType}
                    >
                      + Add another ticket type
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="wizard-step wizard-publish">
              <div className="step-copy">
                <span className="step-number">Step 4 of 4</span>
                <h2>Ready to share it?</h2>
                <p>
                  Review how the event will look, then choose where Oasis should
                  publish it.
                </p>
              </div>
              <div className="publish-preview panel">
                <div className="publish-preview-image">
                  <Image
                    src={imageSrc}
                    alt="Event preview"
                    fill
                    unoptimized={preview.startsWith("blob:")}
                    sizes="(max-width: 800px) 100vw, 32vw"
                  />
                </div>
                <div className="publish-preview-copy">
                  <span className="kicker">{draft.template}</span>
                  <h3>{generatedTitle}</h3>
                  <p>
                    <CalendarDays size={14} />
                    {draft.date} · {draft.startTime}
                  </p>
                  <p>
                    <MapPin size={14} />
                    {location.name}
                  </p>
                  <p className="preview-description">{generatedDescription}</p>
                  <div>
                    <span>
                      {draft.ticketMode === "ticketed"
                        ? `$${draft.price}`
                        : draft.ticketMode === "rsvp"
                          ? "Free RSVP"
                          : "No registration"}
                    </span>
                    <span>{draft.capacity} capacity</span>
                  </div>
                </div>
              </div>
              <div className="destination-panel panel">
                <div>
                  <div>
                    <span className="kicker">Publish everywhere</span>
                    <h3>Choose destinations</h3>
                  </div>
                  <span className="all-ready">
                    <Check size={14} />
                    Copy generated
                  </span>
                </div>
                <div className="destination-grid">
                  {[
                    "Website",
                    "Tickets",
                    "Oasis Links",
                    "Google Drive",
                    "Instagram",
                    "Facebook",
                    "Google",
                  ].map((name) => {
                    const enabled =
                      draft.destinations.includes(name) &&
                      !(name === "Tickets" && draft.ticketMode === "none");
                    return (
                      <button
                        type="button"
                        aria-pressed={enabled}
                        className={enabled ? "enabled" : ""}
                        key={name}
                        onClick={() => {
                          if (name === "Tickets" && draft.ticketMode === "none")
                            return;
                          update(
                            "destinations",
                            enabled
                              ? draft.destinations.filter(
                                  (item) => item !== name,
                                )
                              : [...draft.destinations, name],
                          );
                        }}
                      >
                        <span>
                          {name === "Oasis Links" ? (
                            <Link2 />
                          ) : name === "Tickets" ? (
                            <Ticket />
                          ) : name === "Google Drive" ? (
                            <CloudUpload />
                          ) : (
                            <Globe2 />
                          )}
                        </span>
                        <strong>{name}</strong>
                        <small>{enabled ? "Ready" : "Off"}</small>
                        <i>
                          <span />
                        </i>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="campaign-note">
                <Sparkles size={18} />
                <span>
                  <strong>Weekend event campaign added</strong>
                  <small>
                    Launch post, reminder, final call, and day-of story are
                    ready to schedule.
                  </small>
                </span>
                <span>4 posts</span>
              </div>
            </div>
          )}

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <footer className="wizard-footer">
            <button
              type="button"
              className="button button-secondary"
              onClick={() =>
                step === 1
                  ? router.push("/admin/events")
                  : setStep((current) => current - 1)
              }
            >
              <ArrowLeft size={16} />
              {step === 1 ? "Cancel" : "Back"}
            </button>
            <div>
              {step === 4 && (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => submit("draft")}
                  disabled={saving}
                >
                  Save draft
                </button>
              )}
              <button
                type="button"
                className="button button-primary"
                disabled={!canContinue() || saving}
                onClick={() =>
                  step === 4
                    ? submit("publish")
                    : setStep((current) => current + 1)
                }
              >
                {saving ? (
                  <LoaderCircle className="spin" size={17} />
                ) : step === 4 ? (
                  <>
                    <PartyPopper size={17} />
                    Publish event
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}
