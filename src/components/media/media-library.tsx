"use client";

import {
  Check,
  CloudUpload,
  Download,
  ImageIcon,
  Search,
  Upload,
  Video,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { events } from "@/lib/demo-data";

const filters = [
  "Recent",
  "Events",
  "Food",
  "Venue",
  "People",
  "Flyers",
  "Video",
  "Archive status",
];
const demoAssets = [
  ...events.map((event, index) => ({
    id: event.id,
    url: event.imageUrl,
    name: `${event.title} flyer.jpg`,
    type: "Flyer",
    event: event.title,
    archived: index !== 3,
    ratio: index === 0 ? "portrait" : "square",
  })),
  {
    id: "food-1",
    url: "https://images.unsplash.com/photo-1565299507177-b0ac66763828?auto=format&fit=crop&w=1000&q=84",
    name: "Birria tacos — summer menu.jpg",
    type: "Food",
    event: "Summer menu",
    archived: true,
    ratio: "landscape",
  },
  {
    id: "venue-1",
    url: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1000&q=84",
    name: "Courtyard at golden hour.jpg",
    type: "Venue",
    event: "Oasis Downtown",
    archived: true,
    ratio: "landscape",
  },
];

export type MediaAssetView = {
  id: string;
  url: string;
  name: string;
  type: string;
  event: string;
  archived: boolean;
  ratio: string;
};

export function MediaLibrary({
  initialAssets = demoAssets,
}: {
  initialAssets?: MediaAssetView[];
}) {
  const [assets, setAssets] = useState(initialAssets);
  const [active, setActive] = useState("Recent");
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(initialAssets[0]?.id ?? "");
  const selected =
    assets.find((asset) => asset.id === selectedId) ?? assets[0] ?? null;

  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    setNotice("");
    const body = new FormData();
    body.set("file", file);
    body.set("category", "recent");
    try {
      const response = await fetch("/api/media", { method: "POST", body });
      const result = await response.json();
      if (response.ok) {
        const uploaded = result.asset;
        setAssets((current) => [
          {
            id: uploaded.id,
            url:
              uploaded.public_url ??
              uploaded.publicUrl ??
              "/event-placeholder.svg",
            name: uploaded.file_name ?? uploaded.fileName ?? file.name,
            type: file.type.startsWith("video/") ? "Video" : "Recent",
            event: "New upload",
            archived: false,
            ratio: "square",
          },
          ...current,
        ]);
        setSelectedId(uploaded.id);
      }
      setNotice(
        response.ok
          ? result.archiveStatus === "queued"
            ? `${file.name} is ready. Drive archival has been queued.`
            : result.archiveStatus === "simulated"
              ? `${file.name} is ready in preview mode. No external archive was created.`
              : `${file.name} is ready in Oasis. Connect Drive to archive it automatically.`
          : result.error,
      );
    } catch {
      setNotice(
        "The upload didn’t finish. Check your connection and try again.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <div className="media-toolbar">
        <label className="collection-search">
          <Search size={17} />
          <input
            aria-label="Search media"
            placeholder="Search files, events, or tags"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="button button-primary upload-button">
          <Upload size={17} />
          {uploading ? "Uploading…" : "Upload media"}
          <input
            type="file"
            accept="image/*,video/mp4,video/quicktime"
            onChange={(event) => upload(event.target.files?.[0])}
            disabled={uploading}
          />
        </label>
      </div>
      {notice && (
        <div className="upload-notice">
          <Check size={16} />
          {notice}
        </div>
      )}
      <div className="media-filters">
        {filters.map((filter) => (
          <button
            type="button"
            className={active === filter ? "active" : ""}
            onClick={() => setActive(filter)}
            key={filter}
          >
            {filter}
          </button>
        ))}
      </div>
      <div className="media-layout">
        <div className="media-grid">
          {assets
            .filter(
              (asset) =>
                active === "Recent" ||
                (active === "Events" && asset.event) ||
                asset.type === active ||
                active === "Archive status",
            )
            .filter((asset) =>
              `${asset.name} ${asset.event} ${asset.type}`
                .toLowerCase()
                .includes(query.trim().toLowerCase()),
            )
            .map((asset) => (
              <button
                className={`media-card media-${asset.ratio}`}
                type="button"
                key={asset.id}
                aria-pressed={selected?.id === asset.id}
                onClick={() => setSelectedId(asset.id)}
              >
                {asset.type === "Video" ? (
                  <video src={asset.url} muted playsInline />
                ) : (
                  <Image
                    src={asset.url}
                    alt={asset.name}
                    fill
                    sizes="(max-width: 800px) 50vw, 24vw"
                  />
                )}
                <span className="media-type">
                  {asset.type === "Video" ? <Video /> : <ImageIcon />}
                  {asset.type}
                </span>
                <span className="archive-state">
                  {asset.archived ? (
                    <>
                      <Check />
                      Drive saved
                    </>
                  ) : (
                    <>
                      <CloudUpload />
                      Needs archive
                    </>
                  )}
                </span>
                <span className="media-card-copy">
                  <strong>{asset.name}</strong>
                  <small>{asset.event}</small>
                </span>
              </button>
            ))}
        </div>
        {selected ? (
          <aside className="media-inspector panel">
            <div className="inspector-preview">
              {selected.type === "Video" ? (
                <video src={selected.url} controls playsInline />
              ) : (
                <Image
                  src={selected.url}
                  alt={selected.name}
                  fill
                  sizes="280px"
                />
              )}
            </div>
            <div>
              <span className="kicker">Selected asset</span>
              <h2>{selected.name}</h2>
              <p>
                {selected.type} · {selected.event}
              </p>
            </div>
            <dl>
              <div>
                <dt>Category</dt>
                <dd>{selected.type}</dd>
              </div>
              <div>
                <dt>Archive</dt>
                <dd>
                  {selected.archived ? <Check /> : <CloudUpload />}
                  {selected.archived ? "Saved to Drive" : "Needs archive"}
                </dd>
              </div>
              <div>
                <dt>Related to</dt>
                <dd>{selected.event}</dd>
              </div>
            </dl>
            <div className="inspector-actions">
              <a
                className="button button-primary"
                href={selected.url}
                download={selected.name}
                target="_blank"
                rel="noreferrer"
              >
                <Download size={16} />
                Download
              </a>
              <label className="button button-secondary upload-button">
                Replace
                <input
                  type="file"
                  accept="image/*,video/mp4,video/quicktime"
                  onChange={(event) => upload(event.target.files?.[0])}
                  disabled={uploading}
                />
              </label>
            </div>
          </aside>
        ) : (
          <aside className="media-inspector panel locations-empty">
            <ImageIcon />
            <strong>No media yet</strong>
            <small>Upload the first original to begin the library.</small>
          </aside>
        )}
      </div>
    </>
  );
}
