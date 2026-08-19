"use client";

import {
  CalendarClock,
  Check,
  ChevronDown,
  Copy,
  ImagePlus,
  LoaderCircle,
  Pencil,
  Plus,
  Send,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { StatusPill } from "@/components/ui";
import type { CampaignVariants } from "@/lib/integrations/openai";
import type { ContentItem, OasisEvent } from "@/lib/types";

const initialVariants: CampaignVariants = {
  instagram: "",
  facebook: "",
  google: "",
  website: "",
  story: "",
  reminder: "",
};
const presets = [
  "Standard Event",
  "Paint & Sip",
  "Weekend DJ",
  "Heavy Campaign",
  "Recurring Weekly",
];
type CampaignRow = {
  label: string;
  offsetDays: number;
  time: string;
  channel: "instagram" | "facebook" | "google_business" | "website";
  copyKey: keyof CampaignVariants;
  enabled: boolean;
};

const standardRows: CampaignRow[] = [
  {
    label: "Launch",
    offsetDays: -21,
    time: "10:00",
    channel: "instagram" as const,
    copyKey: "instagram" as const,
    enabled: true,
  },
  {
    label: "Two-week reminder",
    offsetDays: -14,
    time: "11:30",
    channel: "facebook" as const,
    copyKey: "facebook" as const,
    enabled: true,
  },
  {
    label: "One week",
    offsetDays: -7,
    time: "11:30",
    channel: "instagram",
    copyKey: "instagram",
    enabled: true,
  },
  {
    label: "Final push",
    offsetDays: -3,
    time: "18:30",
    channel: "instagram" as const,
    copyKey: "reminder" as const,
    enabled: true,
  },
  {
    label: "Tomorrow",
    offsetDays: -1,
    time: "12:00",
    channel: "google_business" as const,
    copyKey: "google" as const,
    enabled: true,
  },
  {
    label: "Event morning",
    offsetDays: 0,
    time: "09:00",
    channel: "website" as const,
    copyKey: "website" as const,
    enabled: true,
  },
  {
    label: "Doors soon",
    offsetDays: 0,
    time: "17:30",
    channel: "instagram",
    copyKey: "story",
    enabled: true,
  },
];

const presetTimelines: Record<string, CampaignRow[]> = {
  "Standard Event": standardRows,
  "Paint & Sip": standardRows.filter((row) =>
    ["Launch", "One week", "Final push", "Tomorrow", "Event morning"].includes(
      row.label,
    ),
  ),
  "Weekend DJ": standardRows.filter((row) =>
    [
      "One week",
      "Final push",
      "Tomorrow",
      "Event morning",
      "Doors soon",
    ].includes(row.label),
  ),
  "Heavy Campaign": [
    { ...standardRows[0], label: "Save the date", offsetDays: -28 },
    ...standardRows,
    { ...standardRows[3], label: "Midweek push", offsetDays: -5 },
    { ...standardRows[4], label: "48 hours", offsetDays: -2 },
  ].toSorted(
    (a, b) => a.offsetDays - b.offsetDays || a.time.localeCompare(b.time),
  ),
  "Recurring Weekly": [
    { ...standardRows[2], label: "This week", offsetDays: -5 },
    { ...standardRows[3], label: "Weekend reminder", offsetDays: -2 },
    { ...standardRows[5], label: "Today", offsetDays: 0 },
    standardRows[6],
  ],
};

export function ContentStudio({
  eventOptions,
  contentOptions,
}: {
  eventOptions: OasisEvent[];
  contentOptions: ContentItem[];
}) {
  const [title, setTitle] = useState(
    eventOptions[0]
      ? `${eventOptions[0].title} campaign`
      : "New standalone content",
  );
  const [instruction, setInstruction] = useState(
    eventOptions[0]
      ? `A warm campaign for ${eventOptions[0].title}. Keep the details clear and make the invitation feel unmistakably Oasis.`
      : "",
  );
  const [eventId, setEventId] = useState(eventOptions[0]?.id ?? "");
  const [variants, setVariants] = useState(initialVariants);
  const [activeVariant, setActiveVariant] =
    useState<keyof CampaignVariants>("instagram");
  const [generating, setGenerating] = useState(false);
  const [preset, setPreset] = useState("Standard Event");
  const [timeline, setTimeline] = useState<CampaignRow[]>(standardRows);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [scheduleId, setScheduleId] = useState("");
  const [mediaUrl, setMediaUrl] = useState(
    eventOptions[0]?.imageUrl ?? "/event-placeholder.svg",
  );
  const [mediaAssetId, setMediaAssetId] = useState("");
  const [contentType, setContentType] = useState<
    "social" | "email" | "website" | "announcement"
  >("social");
  const [mediaKind, setMediaKind] = useState<"image" | "video">("image");
  const [contentFilter, setContentFilter] = useState<
    "All" | "Drafts" | "Scheduled"
  >("All");
  const selectedEvent =
    eventOptions.find((event) => event.id === eventId) ?? null;

  function momentLabel(row: CampaignRow) {
    if (!selectedEvent) return `Event relative · ${row.time}`;
    const date = new Date(`${selectedEvent.date}T12:00:00`);
    date.setDate(date.getDate() + row.offsetDays);
    return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${row.time}`;
  }

  async function generate() {
    setGenerating(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: selectedEvent?.title ?? title,
          details: instruction,
          eventDate: selectedEvent?.date,
          location: selectedEvent?.locationName ?? "Oasis",
          tone: preset,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setVariants(data.variants);
      setNotice(
        data.mode === "preview"
          ? "Campaign draft generated in preview mode. Every field is ready to edit."
          : "Campaign draft generated. Review every channel before scheduling.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Campaign copy couldn’t be generated.",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function schedule(publishNow = false) {
    if (!selectedEvent) {
      setError(
        "Link this content to an event before scheduling channel publishing.",
      );
      return;
    }
    if (!variants.instagram) {
      setError("Generate or write the channel copy before scheduling.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    const base = selectedEvent
      ? new Date(`${selectedEvent.date}T12:00:00`)
      : new Date();
    const posts = timeline.map((row, index) => {
      const date = publishNow
        ? new Date(base.getTime() + index * 1000)
        : new Date(base.getTime() + row.offsetDays * 86400000);
      if (!publishNow) {
        const [hours, minutes] = row.time.split(":").map(Number);
        date.setHours(hours, minutes, 0, 0);
      }
      return {
        channel: row.channel,
        copyKey: row.copyKey,
        enabled: row.enabled,
        scheduledFor: date.toISOString(),
      };
    });
    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          eventId,
          masterCaption: instruction,
          mediaUrl,
          preset,
          variants,
          posts,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setScheduleId(data.scheduleId);
      setNotice(
        publishNow
          ? `${data.posts} campaign moments queued to publish now.`
          : `${data.posts} campaign moments scheduled. Each will publish independently and remain retryable.`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The campaign couldn’t be scheduled.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function cancelSchedule() {
    if (!scheduleId) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId, action: "cancel" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setScheduleId("");
      setNotice(
        `Campaign cancelled${data.mode === "preview" ? " in preview mode" : ""}. Future posts will not publish.`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The campaign couldn’t be cancelled.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function uploadMedia(file?: File) {
    if (!file) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("category", eventId ? "campaign" : "standalone-content");
      const response = await fetch("/api/media", { method: "POST", body });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "The media could not be uploaded.");
      const asset = data.asset;
      setMediaUrl(
        asset.public_url ?? asset.publicUrl ?? "/event-placeholder.svg",
      );
      setMediaAssetId(asset.id ?? "");
      setMediaKind(file.type.startsWith("video/") ? "video" : "image");
      setNotice(
        `${file.name} is ready${data.mode === "preview" ? " in preview mode" : ""}.`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The media could not be uploaded.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function copyVariant() {
    const copy = variants[activeVariant];
    if (!copy) {
      setError("Write or generate this version before copying it.");
      return;
    }
    await navigator.clipboard.writeText(copy);
    setNotice(`${activeVariant} copy placed on your clipboard.`);
  }

  function addMoment() {
    const nextIndex = timeline.length + 1;
    setTimeline((current) => [
      ...current,
      {
        label: `Custom moment ${nextIndex}`,
        offsetDays: (current.at(-1)?.offsetDays ?? 0) + 1,
        time: "12:00",
        channel: "instagram",
        copyKey: "instagram",
        enabled: true,
      },
    ]);
    setNotice("A new campaign moment was added. Use edit to set its timing.");
  }

  function editMoment(index: number) {
    const current = timeline[index];
    const label = window.prompt("Moment name", current.label)?.trim();
    if (!label) return;
    const offset = Number(
      window.prompt("Days after campaign start", String(current.offsetDays)),
    );
    const time = window.prompt("Publish time (24-hour)", current.time)?.trim();
    if (!Number.isFinite(offset) || !/^\d{2}:\d{2}$/.test(time ?? "")) {
      setError("Use a whole-day offset and a time like 18:30.");
      return;
    }
    setTimeline((rows) =>
      rows.map((row, rowIndex) =>
        rowIndex === index
          ? { ...row, label, offsetDays: offset, time: time! }
          : row,
      ),
    );
    setNotice(`${label} timing updated.`);
  }

  async function saveDraft() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body: instruction,
          eventId: eventId || undefined,
          mediaAssetId: mediaAssetId || undefined,
          contentType,
          variants,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "The content draft could not be saved.");
      setNotice(
        `Content draft saved${data.mode === "preview" ? " in preview mode" : ""}.`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The content draft could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  function startStandalone() {
    setEventId("");
    setTitle("New standalone content");
    setInstruction("");
    setVariants(initialVariants);
    setMediaUrl("/event-placeholder.svg");
    setMediaAssetId("");
    setMediaKind("image");
    setContentType("announcement");
    setNotice("Standalone draft started. Add media and one clear direction.");
  }

  return (
    <div className="content-layout">
      <aside className="content-library panel">
        <div className="content-library-title">
          <span className="kicker">Content</span>
          <button onClick={startStandalone} aria-label="Create content">
            <Plus />
          </button>
        </div>
        <div className="content-filter">
          {(["All", "Drafts", "Scheduled"] as const).map((filter) => (
            <button
              className={contentFilter === filter ? "active" : ""}
              onClick={() => setContentFilter(filter)}
              key={filter}
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="content-items">
          {contentOptions
            .filter(
              (item) =>
                contentFilter === "All" ||
                item.status.toLowerCase() ===
                  contentFilter.slice(0, -1).toLowerCase(),
            )
            .map((item) => (
              <button
                className={item.id === contentOptions[0]?.id ? "active" : ""}
                key={item.id}
              >
                <Image src={item.imageUrl} alt="" width={46} height={46} />
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.channel}</small>
                </span>
                <StatusPill status={item.status} />
              </button>
            ))}
        </div>
        <button className="new-content-button" onClick={startStandalone}>
          <ImagePlus />
          Create standalone content
        </button>
      </aside>
      <section className="content-workspace">
        <div className="content-title-row">
          <div>
            <span className="kicker">Campaign studio</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              aria-label="Campaign title"
            />
          </div>
          <StatusPill status={variants.instagram ? "Ready" : "Draft"} />
        </div>
        <div className="content-source panel">
          <div className="source-media">
            {mediaKind === "video" ? (
              <video src={mediaUrl} controls playsInline />
            ) : (
              <Image
                src={mediaUrl}
                alt={selectedEvent?.imageAlt ?? "Content creative preview"}
                fill
                sizes="180px"
              />
            )}
            <label className="source-media-picker" aria-label="Replace media">
              <Pencil />
              <input
                type="file"
                accept="image/*,video/mp4,video/quicktime"
                hidden
                onChange={(event) => uploadMedia(event.target.files?.[0])}
                disabled={saving}
              />
            </label>
          </div>
          <div className="source-fields">
            <label className="field">
              <span>Related event</span>
              <select
                value={eventId}
                onChange={(event) => {
                  const nextId = event.target.value;
                  setEventId(nextId);
                  const nextEvent = eventOptions.find(
                    (candidate) => candidate.id === nextId,
                  );
                  if (nextEvent) {
                    setMediaUrl(nextEvent.imageUrl);
                    setMediaKind("image");
                    setTitle(`${nextEvent.title} campaign`);
                    setContentType("social");
                  }
                }}
              >
                <option value="">Standalone — no event</option>
                {eventOptions.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
              <ChevronDown />
            </label>
            <label className="field">
              <span>Content type</span>
              <select
                value={contentType}
                onChange={(event) =>
                  setContentType(
                    event.target.value as
                      "social" | "email" | "website" | "announcement",
                  )
                }
              >
                <option value="social">Social post</option>
                <option value="announcement">Announcement</option>
                <option value="website">Website</option>
                <option value="email">Email</option>
              </select>
              <ChevronDown />
            </label>
            <label className="field">
              <span>Master direction</span>
              <textarea
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                rows={4}
              />
            </label>
            <div className="generate-row">
              <label>
                Campaign preset
                <select
                  value={preset}
                  onChange={(event) => {
                    const nextPreset = event.target.value;
                    setPreset(nextPreset);
                    setTimeline(
                      (presetTimelines[nextPreset] ?? standardRows).map(
                        (row) => ({
                          ...row,
                        }),
                      ),
                    );
                  }}
                >
                  {presets.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <button
                className="button ai-button"
                onClick={generate}
                disabled={generating}
              >
                {generating ? <LoaderCircle className="spin" /> : <Sparkles />}
                Generate campaign
              </button>
            </div>
          </div>
        </div>
        {notice && (
          <div className="upload-notice">
            <Check />
            {notice}
          </div>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <section className="variant-editor panel">
          <div className="variant-tabs">
            {(
              [
                "instagram",
                "facebook",
                "google",
                "website",
                "story",
              ] as (keyof CampaignVariants)[]
            ).map((variant) => (
              <button
                className={activeVariant === variant ? "active" : ""}
                onClick={() => setActiveVariant(variant)}
                key={variant}
              >
                {variant}
                <span>{variants[variant] ? <Check /> : null}</span>
              </button>
            ))}
          </div>
          <div className="variant-body">
            <div>
              <span className="kicker">{activeVariant} copy</span>
              <h2>Make it right for the channel.</h2>
              <p>
                Generated copy is a starting point. Your team stays in control.
              </p>
            </div>
            <label>
              <textarea
                value={variants[activeVariant]}
                onChange={(event) =>
                  setVariants((current) => ({
                    ...current,
                    [activeVariant]: event.target.value,
                  }))
                }
                rows={9}
                placeholder="Generate a campaign or write this channel’s copy here."
              />
              <small>{variants[activeVariant].length} characters</small>
            </label>
            <div className="variant-actions">
              <button onClick={copyVariant}>
                <Copy />
                Copy
              </button>
              <button onClick={generate} disabled={generating}>
                <Sparkles />
                Regenerate this version
              </button>
            </div>
          </div>
        </section>
        <section className="campaign-editor">
          <div className="section-heading">
            <div>
              <h2>Campaign timeline</h2>
              <p>
                Change any time, channel, or piece of copy before it goes live.
              </p>
            </div>
            <button className="button button-secondary" onClick={addMoment}>
              <Plus />
              Add moment
            </button>
          </div>
          <div className="campaign-timeline panel">
            {timeline.map((row, index) => (
              <div className={row.enabled ? "" : "disabled"} key={row.label}>
                <button
                  aria-label={`${row.enabled ? "Disable" : "Enable"} ${row.label}`}
                  onClick={() =>
                    setTimeline((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, enabled: !item.enabled }
                          : item,
                      ),
                    )
                  }
                >
                  {row.enabled ? <ToggleRight /> : <ToggleLeft />}
                </button>
                <span className="timeline-marker">
                  <span />
                </span>
                <span>
                  <strong>{row.label}</strong>
                  <small>{momentLabel(row)}</small>
                </span>
                <em>{row.channel.replace("_business", "")}</em>
                <span className="timeline-copy-preview">
                  {variants[row.copyKey] ||
                    "Copy will appear after generation."}
                </span>
                <button
                  aria-label={`Edit ${row.label}`}
                  onClick={() => editMoment(index)}
                >
                  <Pencil />
                </button>
              </div>
            ))}
          </div>
        </section>
        <footer className="content-footer">
          <span>
            <CalendarClock />
            {timeline.filter((row) => row.enabled).length} moments ready to
            schedule
          </span>
          <div>
            <button
              className="button button-secondary"
              onClick={saveDraft}
              disabled={saving}
            >
              Save draft
            </button>
            {scheduleId ? (
              <button
                className="button button-secondary"
                onClick={cancelSchedule}
                disabled={saving}
              >
                Cancel schedule
              </button>
            ) : (
              <button
                className="button button-secondary"
                onClick={() => schedule(true)}
                disabled={saving}
              >
                <Send />
                Publish now
              </button>
            )}
            <button
              className="button button-primary"
              onClick={() => schedule(false)}
              disabled={saving}
            >
              {saving ? <LoaderCircle className="spin" /> : <CalendarClock />}
              Schedule campaign
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
