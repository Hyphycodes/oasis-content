"use client";

import {
  Check,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  ImagePlus,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { events } from "@/lib/demo-data";

type MenuItem = {
  id: string;
  sectionId: string;
  name: string;
  description: string;
  price: number;
  available: boolean;
  featured: boolean;
  dietaryTags: string[];
  sortOrder: number;
};
export type MenuSectionView = {
  id: string;
  name: string;
  description: string;
  items: MenuItem[];
};
const initialSections = [
  {
    id: "sec-share",
    name: "Para Compartir",
    description: "Made for the table",
    items: [
      {
        id: "item-queso",
        sectionId: "sec-share",
        name: "Oasis Queso Fundido",
        description: "Roasted poblano, chorizo, Oaxaca cheese, warm tortillas",
        price: 15,
        available: true,
        featured: true,
        dietaryTags: ["GF available"],
        sortOrder: 0,
      },
      {
        id: "item-guac",
        sectionId: "sec-share",
        name: "Tableside Guacamole",
        description: "Avocado, lime, serrano, cilantro, warm tostadas",
        price: 13,
        available: true,
        featured: false,
        dietaryTags: ["Vegan", "GF"],
        sortOrder: 1,
      },
      {
        id: "item-elote",
        sectionId: "sec-share",
        name: "Charred Elote",
        description: "Chile-lime crema, cotija, smoked chile",
        price: 9,
        available: true,
        featured: false,
        dietaryTags: ["Vegetarian", "GF"],
        sortOrder: 2,
      },
    ],
  },
  {
    id: "sec-tacos",
    name: "Tacos & Platos",
    description: "Corn tortillas made daily",
    items: [
      {
        id: "item-birria",
        sectionId: "sec-tacos",
        name: "Birria Tacos",
        description:
          "Slow-braised beef, Oaxaca cheese, onion, cilantro, consommé",
        price: 18,
        available: true,
        featured: true,
        dietaryTags: [],
        sortOrder: 0,
      },
      {
        id: "item-cauliflower",
        sectionId: "sec-tacos",
        name: "Crispy Cauliflower Tacos",
        description: "Adobo, avocado crema, cabbage, pickled onion",
        price: 15,
        available: true,
        featured: false,
        dietaryTags: ["Vegetarian"],
        sortOrder: 1,
      },
    ],
  },
];

type SiteCopy = {
  hero: string;
  subtitle: string;
  heroImage: string;
  primaryCta: string;
  secondaryCta: string;
  eventsHeading: string;
  banner: string;
  privateEvents: string;
  phone: string;
  address: string;
  hours: string;
  reservationUrl: string;
};

const previewSiteCopy: SiteCopy = {
  hero: "Good food. Good music. Good people.",
  subtitle: "Mexican kitchen, bar, and culture—made for getting together.",
  heroImage:
    "https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=1800&q=88",
  primaryCta: "See what’s on",
  secondaryCta: "Explore the menu",
  eventsHeading: "There’s always a reason to stay awhile.",
  banner: "Selena Forever · Tickets on sale now",
  privateEvents:
    "Bring your celebration to Oasis. We’ll help shape the menu, music, and room around your people.",
  phone: "(817) 555-0148",
  address: "Fort Worth, Texas",
  hours: "Tue–Sun · 11am–2am",
  reservationUrl: "tel:+18175550148",
};

export function MenuEditor({
  initialMenuId = "preview-menu",
  initialLocationName = "Oasis Downtown",
  initialSections: suppliedSections = initialSections,
  initialSiteCopy = previewSiteCopy,
}: {
  initialMenuId?: string;
  initialLocationName?: string;
  initialSections?: MenuSectionView[];
  initialSiteCopy?: SiteCopy;
}) {
  const [view, setView] = useState<"menu" | "website">("menu");
  const [sections, setSections] = useState(suppliedSections);
  const [menuId, setMenuId] = useState(initialMenuId);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [dragging, setDragging] = useState<{
    sectionId: string;
    itemId: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [siteCopy, setSiteCopy] = useState(initialSiteCopy);

  async function persistItem(item: MenuItem) {
    const response = await fetch("/api/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error ?? "The menu item could not be saved.");
    return data;
  }

  async function toggleAvailability(sectionId: string, id: string) {
    const item = sections
      .find((section) => section.id === sectionId)
      ?.items.find((candidate) => candidate.id === id);
    if (!item) return;
    const updated = { ...item, available: !item.available };
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map((item) =>
                item.id === id ? updated : item,
              ),
            }
          : section,
      ),
    );
    try {
      await persistItem(updated);
      setNotice(
        `${updated.name} is now ${updated.available ? "visible" : "hidden"}.`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Availability could not be saved.",
      );
    }
  }

  async function reorderItem(sectionId: string, targetId: string) {
    if (
      !dragging ||
      dragging.sectionId !== sectionId ||
      dragging.itemId === targetId
    )
      return;
    const section = sections.find((candidate) => candidate.id === sectionId);
    if (!section) return;
    const from = section.items.findIndex((item) => item.id === dragging.itemId);
    const to = section.items.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const reordered = [...section.items];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    const normalized = reordered.map((item, sortOrder) => ({
      ...item,
      sortOrder,
    }));
    setSections((current) =>
      current.map((candidate) =>
        candidate.id === sectionId
          ? { ...candidate, items: normalized }
          : candidate,
      ),
    );
    setDragging(null);
    try {
      await Promise.all(normalized.map((item) => persistItem(item)));
      setNotice(`${moved.name} moved and the menu order was saved.`);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "The new order could not be saved.",
      );
    }
  }
  function duplicate(sectionId: string, item: MenuItem) {
    setEditing({
      ...item,
      id: "",
      sectionId,
      name: `${item.name} copy`,
      sortOrder:
        sections.find((section) => section.id === sectionId)?.items.length ?? 0,
    });
  }
  async function saveItem(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const savedItem = data.item as MenuItem;
      setSections((current) =>
        current.map((section) =>
          section.id === editing.sectionId
            ? {
                ...section,
                items: section.items.some((item) => item.id === editing.id)
                  ? section.items.map((item) =>
                      item.id === editing.id ? savedItem : item,
                    )
                  : [...section.items, savedItem],
              }
            : section,
        ),
      );
      setEditing(null);
      setNotice(
        `${editing.name} saved${data.mode === "preview" ? " in preview mode" : ""}.`,
      );
    } catch (caught) {
      setNotice(
        caught instanceof Error
          ? caught.message
          : "The item couldn’t be saved.",
      );
    } finally {
      setSaving(false);
    }
  }
  function addItem(sectionId: string) {
    setEditing({
      id: "",
      sectionId,
      name: "",
      description: "",
      price: 0,
      available: true,
      featured: false,
      dietaryTags: [],
      sortOrder:
        sections.find((section) => section.id === sectionId)?.items.length ?? 0,
    });
  }

  async function addSection() {
    const name = window.prompt("Section name");
    if (!name?.trim()) return;
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "section",
          menuId: menuId || undefined,
          name,
          description: "",
          sortOrder: sections.length,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMenuId(data.menuId);
      setSections((current) => [...current, data.section]);
      setNotice(
        `${name} added${data.mode === "preview" ? " in preview mode" : ""}.`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "The section could not be added.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function publishMenu() {
    if (!menuId) {
      setNotice("Add a menu section before publishing.");
      return;
    }
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "publish", menuId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setNotice(
        `Menu published${data.mode === "preview" ? " in preview mode" : ""}.`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "The menu could not be published.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveSite(publish: boolean) {
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/api/site-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...siteCopy, publish }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Website content could not be saved.");
      setNotice(
        `${publish ? "Website changes published" : "Website draft saved"}${data.mode === "preview" ? " in preview mode" : ""}.`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Website content could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function chooseHero(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice("Choose an image for the homepage hero.");
      return;
    }
    setSaving(true);
    setNotice("");
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("category", "website");
      const response = await fetch("/api/media", { method: "POST", body });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "The hero image could not be uploaded.");
      const heroImage =
        data.asset?.public_url ?? data.asset?.publicUrl ?? data.asset?.url;
      if (!heroImage) throw new Error("The uploaded image is missing its URL.");
      setSiteCopy((current) => ({ ...current, heroImage }));
      setNotice(
        `Hero image ready${data.mode === "preview" ? " in preview mode" : ""}. Save or publish when the copy is ready.`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "The hero image could not be uploaded.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem() {
    if (!editing) return;
    if (!editing.id) {
      setEditing(null);
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/menu", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSections((current) =>
        current.map((section) => ({
          ...section,
          items: section.items.filter((item) => item.id !== editing.id),
        })),
      );
      setNotice(
        `${editing.name} deleted${data.mode === "preview" ? " in preview mode" : ""}.`,
      );
      setEditing(null);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "The item could not be deleted.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="menu-view-tabs">
        <button
          className={view === "menu" ? "active" : ""}
          onClick={() => setView("menu")}
        >
          Menu
        </button>
        <button
          className={view === "website" ? "active" : ""}
          onClick={() => setView("website")}
        >
          Website content
        </button>
        <span />
        <div className="menu-location-label">{initialLocationName}</div>
      </div>
      {notice && (
        <div className="upload-notice">
          <Check />
          {notice}
        </div>
      )}
      {view === "menu" ? (
        <div className="menu-admin-layout">
          <section className="menu-sections">
            {sections.map((section) => (
              <article className="panel menu-section-card" key={section.id}>
                <header>
                  <span>
                    <GripVertical />
                    <span>
                      <strong>{section.name}</strong>
                      <small>
                        {section.description} · {section.items.length} items
                      </small>
                    </span>
                  </span>
                </header>
                <div className="menu-item-list">
                  {section.items.map((item) => (
                    <div
                      className={item.available ? "" : "unavailable"}
                      key={item.id}
                      draggable
                      aria-grabbed={dragging?.itemId === item.id}
                      onDragStart={() =>
                        setDragging({ sectionId: section.id, itemId: item.id })
                      }
                      onDragEnd={() => setDragging(null)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => reorderItem(section.id, item.id)}
                    >
                      <GripVertical />
                      <span className="menu-item-photo">
                        {item.featured ? <Sparkles /> : item.name.slice(0, 1)}
                      </span>
                      <span>
                        <strong>
                          {item.name}
                          {item.featured && <em>Featured</em>}
                        </strong>
                        <small>{item.description}</small>
                        <span>
                          {item.dietaryTags.map((tag) => (
                            <b key={tag}>{tag}</b>
                          ))}
                        </span>
                      </span>
                      <label>
                        $
                        <input
                          aria-label={`${item.name} price`}
                          type="number"
                          value={item.price}
                          onChange={(event) =>
                            setSections((current) =>
                              current.map((currentSection) =>
                                currentSection.id === section.id
                                  ? {
                                      ...currentSection,
                                      items: currentSection.items.map(
                                        (currentItem) =>
                                          currentItem.id === item.id
                                            ? {
                                                ...currentItem,
                                                price: Number(
                                                  event.target.value,
                                                ),
                                              }
                                            : currentItem,
                                      ),
                                    }
                                  : currentSection,
                              ),
                            )
                          }
                          onBlur={async () => {
                            try {
                              await persistItem(item);
                              setNotice(`${item.name} price updated.`);
                            } catch (error) {
                              setNotice(
                                error instanceof Error
                                  ? error.message
                                  : "The price could not be saved.",
                              );
                            }
                          }}
                        />
                      </label>
                      <button
                        aria-label={
                          item.available
                            ? `Hide ${item.name}`
                            : `Show ${item.name}`
                        }
                        onClick={() => toggleAvailability(section.id, item.id)}
                      >
                        {item.available ? <Eye /> : <EyeOff />}
                      </button>
                      <button
                        aria-label={`Edit ${item.name}`}
                        onClick={() => setEditing(item)}
                      >
                        <Pencil />
                      </button>
                      <button
                        aria-label={`Duplicate ${item.name}`}
                        onClick={() => duplicate(section.id, item)}
                      >
                        <Copy />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  className="add-menu-item"
                  onClick={() => addItem(section.id)}
                >
                  <Plus />
                  Add item to {section.name}
                </button>
              </article>
            ))}
            <div className="menu-editor-actions">
              <button
                className="button button-secondary"
                onClick={addSection}
                disabled={saving}
              >
                <Plus />
                Add menu section
              </button>
              <button
                className="button button-primary"
                onClick={publishMenu}
                disabled={saving || !sections.length}
              >
                <Save />
                Publish menu
              </button>
            </div>
          </section>
          <aside className="menu-preview panel">
            <div className="menu-preview-top">
              <span className="kicker">Live preview</span>
              <span>Mobile</span>
            </div>
            <div className="phone-frame">
              <div>
                <span>Oasis</span>
                <small>
                  {initialLocationName.replace(/^Oasis\s+/i, "")} menu
                </small>
              </div>
              {sections.map((section) => (
                <section key={section.id}>
                  <h3>{section.name}</h3>
                  {section.items
                    .filter((item) => item.available)
                    .map((item) => (
                      <div key={item.id}>
                        <span>
                          <strong>{item.name}</strong>
                          <small>{item.description}</small>
                        </span>
                        <em>${item.price}</em>
                      </div>
                    ))}
                </section>
              ))}
            </div>
          </aside>
        </div>
      ) : (
        <section className="site-content-editor">
          <div className="panel content-block">
            <div>
              <span className="kicker">Homepage hero</span>
              <h2>The first thing guests see</h2>
              <p>Global · All locations</p>
            </div>
            <div className="site-hero-preview">
              <Image
                src={siteCopy.heroImage || events[1].imageUrl}
                alt="Oasis homepage preview"
                fill
                sizes="50vw"
              />
              <span>
                <small>Oasis</small>
                <strong>{siteCopy.hero}</strong>
                <em>{siteCopy.subtitle}</em>
              </span>
              <label className="site-image-picker">
                <ImagePlus />
                Choose image
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => chooseHero(event.target.files?.[0])}
                  disabled={saving}
                />
              </label>
            </div>
            <label className="field">
              <span>Hero title</span>
              <input
                value={siteCopy.hero}
                onChange={(event) =>
                  setSiteCopy((current) => ({
                    ...current,
                    hero: event.target.value,
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Hero subtitle</span>
              <textarea
                rows={3}
                value={siteCopy.subtitle}
                onChange={(event) =>
                  setSiteCopy((current) => ({
                    ...current,
                    subtitle: event.target.value,
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Primary CTA label</span>
              <input
                value={siteCopy.primaryCta}
                onChange={(event) =>
                  setSiteCopy((current) => ({
                    ...current,
                    primaryCta: event.target.value,
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Secondary CTA label</span>
              <input
                value={siteCopy.secondaryCta}
                onChange={(event) =>
                  setSiteCopy((current) => ({
                    ...current,
                    secondaryCta: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <div className="site-content-grid">
            <article className="panel content-block">
              <span className="kicker">Promotional banner</span>
              <h2>Current announcement</h2>
              <label className="field">
                <span>Banner text</span>
                <input
                  value={siteCopy.banner}
                  onChange={(event) =>
                    setSiteCopy((current) => ({
                      ...current,
                      banner: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Events section heading</span>
                <input
                  value={siteCopy.eventsHeading}
                  onChange={(event) =>
                    setSiteCopy((current) => ({
                      ...current,
                      eventsHeading: event.target.value,
                    }))
                  }
                />
              </label>
            </article>
            <article className="panel content-block">
              <span className="kicker">Private events</span>
              <h2>Celebration copy</h2>
              <label className="field">
                <span>Description</span>
                <textarea
                  rows={5}
                  value={siteCopy.privateEvents}
                  onChange={(event) =>
                    setSiteCopy((current) => ({
                      ...current,
                      privateEvents: event.target.value,
                    }))
                  }
                />
              </label>
            </article>
            <article className="panel content-block">
              <span className="kicker">Visitor details</span>
              <h2>Contact, hours &amp; reservations</h2>
              <label className="field">
                <span>Phone</span>
                <input
                  value={siteCopy.phone}
                  onChange={(event) =>
                    setSiteCopy((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Address</span>
                <input
                  value={siteCopy.address}
                  onChange={(event) =>
                    setSiteCopy((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Hours</span>
                <input
                  value={siteCopy.hours}
                  onChange={(event) =>
                    setSiteCopy((current) => ({
                      ...current,
                      hours: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Reservation URL</span>
                <input
                  value={siteCopy.reservationUrl}
                  onChange={(event) =>
                    setSiteCopy((current) => ({
                      ...current,
                      reservationUrl: event.target.value,
                    }))
                  }
                />
              </label>
            </article>
          </div>
          <footer className="site-editor-footer">
            <span>
              <Check />
              Draft and publish are kept separate
            </span>
            <div>
              <Link
                className="button button-secondary"
                href="/"
                target="_blank"
              >
                Preview website
              </Link>
              <button
                className="button button-secondary"
                onClick={() => saveSite(false)}
                disabled={saving}
              >
                Save draft
              </button>
              <button
                className="button button-primary"
                onClick={() => saveSite(true)}
                disabled={saving}
              >
                <Save />
                Publish changes
              </button>
            </div>
          </footer>
        </section>
      )}
      {editing && (
        <div className="modal-backdrop">
          <form className="menu-item-modal" onSubmit={saveItem}>
            <header>
              <div>
                <span className="kicker">Menu item</span>
                <h2>{editing.name || "Add an item"}</h2>
              </div>
              <button type="button" onClick={() => setEditing(null)}>
                <X />
              </button>
            </header>
            <label className="field">
              <span>Name</span>
              <input
                value={editing.name}
                onChange={(event) =>
                  setEditing({ ...editing, name: event.target.value })
                }
                required
                autoFocus
              />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea
                rows={3}
                value={editing.description}
                onChange={(event) =>
                  setEditing({ ...editing, description: event.target.value })
                }
              />
            </label>
            <div className="form-grid">
              <label className="field">
                <span>Price</span>
                <input
                  type="number"
                  min="0"
                  step=".01"
                  value={editing.price}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      price: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label className="field">
                <span>Available</span>
                <select
                  value={editing.available ? "yes" : "no"}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      available: event.target.value === "yes",
                    })
                  }
                >
                  <option value="yes">Available</option>
                  <option value="no">Hidden</option>
                </select>
              </label>
            </div>
            <label className="feature-check">
              <input
                type="checkbox"
                checked={editing.featured}
                onChange={(event) =>
                  setEditing({ ...editing, featured: event.target.checked })
                }
              />
              <span>
                <strong>Feature this item</strong>
                <small>Give it extra visual emphasis on the public menu.</small>
              </span>
            </label>
            <footer>
              <button
                type="button"
                className="button button-danger"
                onClick={deleteItem}
                disabled={saving}
              >
                <Trash2 />
                Delete
              </button>
              <button className="button button-primary" disabled={saving}>
                {saving ? <LoaderCircle className="spin" /> : <Save />}Save item
              </button>
            </footer>
          </form>
        </div>
      )}
    </>
  );
}
