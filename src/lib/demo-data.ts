import type { ContentItem, Customer, Guest, OasisEvent } from "@/lib/types";

// Development-only fixtures. Keep venue details obviously synthetic so a
// credential-free preview can never be mistaken for a real Oasis location.
export const locations = [
  {
    id: "loc-downtown",
    name: "Oasis Preview — Main Room",
    shortName: "Preview — Main Room",
    address: "Development preview — not a real location",
    phone: "",
    timezone: "America/Chicago",
    hours: "Preview data only",
  },
  {
    id: "loc-southside",
    name: "Oasis Preview — Patio",
    shortName: "Preview — Patio",
    address: "Development preview — not a real location",
    phone: "",
    timezone: "America/Chicago",
    hours: "Preview data only",
  },
];

export const events: OasisEvent[] = [
  {
    id: "evt-selena",
    slug: "selena-forever-dance-night",
    title: "Selena Forever",
    eyebrow: "A dance night for the icon",
    description:
      "Purple lights, cumbia classics, and a room full of love for Selena. DJ Mariposa takes us from Amor Prohibido to late-night Tejano favorites, with a special themed cocktail menu all evening.",
    shortDescription: "Cumbia classics, purple lights, and a full-night tribute to Selena.",
    date: "2026-08-21",
    doorsAt: "8:00 PM",
    startsAt: "9:00 PM",
    endsAt: "1:30 AM",
    locationId: "loc-downtown",
    locationName: "Oasis Preview — Main Room",
    address: "Development preview — not a real location",
    price: 18,
    capacity: 220,
    sold: 174,
    checkedIn: 0,
    revenue: 3132,
    imageUrl: "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1600&q=85",
    imageAlt: "Crowd dancing under warm purple stage lights",
    status: "Live",
    ticketStatus: "On Sale",
    template: "DJ Night",
    ageRestriction: "21+",
    destinations: [
      { name: "Website", status: "Live" },
      { name: "Tickets", status: "On Sale" },
      { name: "Oasis Links", status: "Live" },
      { name: "Google Drive", status: "Saved" },
      { name: "Instagram", status: "Live" },
      { name: "Facebook", status: "Live" },
      { name: "Google", status: "Live" },
    ],
  },
  {
    id: "evt-brunch",
    slug: "domingo-brunch-social",
    title: "Domingo Brunch Social",
    eyebrow: "Brunch · Vinyl · Mimosas",
    description:
      "Slow Sunday energy with vinyl selections, shareable brunch plates, and seasonal mimosas. Reservations are encouraged; walk-ins are always welcome.",
    shortDescription: "A slow Sunday of vinyl, shareable brunch plates, and seasonal mimosas.",
    date: "2026-08-23",
    doorsAt: "11:00 AM",
    startsAt: "11:00 AM",
    endsAt: "4:00 PM",
    locationId: "loc-southside",
    locationName: "Oasis Preview — Patio",
    address: "Development preview — not a real location",
    price: 0,
    capacity: 110,
    sold: 64,
    checkedIn: 0,
    revenue: 0,
    imageUrl: "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1600&q=85",
    imageAlt: "Colorful Mexican brunch plates on a table",
    status: "Live",
    ticketStatus: "Free RSVP",
    template: "Brunch",
    destinations: [
      { name: "Website", status: "Live" },
      { name: "Tickets", status: "On Sale" },
      { name: "Oasis Links", status: "Live" },
      { name: "Google Drive", status: "Saved" },
      { name: "Instagram", status: "Scheduled", detail: "Tomorrow at 10:00 AM" },
      { name: "Facebook", status: "Live" },
      { name: "Google", status: "Live" },
    ],
  },
  {
    id: "evt-banda",
    slug: "banda-bajo-las-estrellas",
    title: "Banda Bajo Las Estrellas",
    eyebrow: "Live on the courtyard stage",
    description:
      "A full live banda set under the courtyard lights, backed by late-night tacos and cold drinks. Capacity is limited for this special outdoor show.",
    shortDescription: "Live banda under the courtyard lights with late-night tacos and cold drinks.",
    date: "2026-08-29",
    doorsAt: "7:30 PM",
    startsAt: "9:00 PM",
    endsAt: "12:30 AM",
    locationId: "loc-downtown",
    locationName: "Oasis Preview — Main Room",
    address: "Development preview — not a real location",
    price: 25,
    capacity: 250,
    sold: 212,
    checkedIn: 0,
    revenue: 5300,
    imageUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1600&q=85",
    imageAlt: "Live band performing to a packed outdoor crowd",
    status: "Needs Attention",
    ticketStatus: "On Sale",
    template: "Banda Saturday",
    ageRestriction: "18+",
    destinations: [
      { name: "Website", status: "Live" },
      { name: "Tickets", status: "On Sale" },
      { name: "Oasis Links", status: "Live" },
      { name: "Google Drive", status: "Saved" },
      { name: "Instagram", status: "Needs Attention", detail: "Reconnect Instagram to retry" },
      { name: "Facebook", status: "Live" },
      { name: "Google", status: "Live" },
    ],
  },
  {
    id: "evt-paint",
    slug: "paint-sip-desert-botanicals",
    title: "Paint & Sip: Desert Botanicals",
    eyebrow: "Guided workshop",
    description: "A relaxed guided painting session with a welcome margarita and all materials included.",
    shortDescription: "Paint desert botanicals with a welcome margarita and all materials included.",
    date: "2026-09-03",
    doorsAt: "6:00 PM",
    startsAt: "6:30 PM",
    endsAt: "9:00 PM",
    locationId: "loc-southside",
    locationName: "Oasis Preview — Patio",
    address: "Development preview — not a real location",
    price: 38,
    capacity: 42,
    sold: 21,
    checkedIn: 0,
    revenue: 798,
    imageUrl: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1600&q=85",
    imageAlt: "Painting supplies arranged for a creative workshop",
    status: "Draft",
    ticketStatus: "Draft",
    template: "Paint & Sip",
    destinations: [
      { name: "Website", status: "Ready" },
      { name: "Tickets", status: "Ready" },
      { name: "Oasis Links", status: "Ready" },
      { name: "Google Drive", status: "Saved" },
      { name: "Instagram", status: "Ready" },
      { name: "Facebook", status: "Ready" },
      { name: "Google", status: "Ready" },
    ],
  },
];

export const eventTemplates = [
  { name: "DJ Night", icon: "Disc3", duration: "4 hours", ticket: "$15–$25", tone: "High energy" },
  { name: "Banda Saturday", icon: "Music2", duration: "5 hours", ticket: "$20–$35", tone: "Live music" },
  { name: "Brunch", icon: "Sun", duration: "5 hours", ticket: "Free RSVP", tone: "Easygoing" },
  { name: "Paint & Sip", icon: "Palette", duration: "2.5 hours", ticket: "$30–$45", tone: "Guided" },
  { name: "Watch Party", icon: "Tv", duration: "3 hours", ticket: "Free", tone: "Community" },
  { name: "Start Fresh", icon: "Sparkles", duration: "Flexible", ticket: "Your choice", tone: "Custom" },
];

export const contentItems: ContentItem[] = [
  {
    id: "content-1",
    title: "Selena Forever — final call",
    channel: "Instagram + Facebook",
    scheduledFor: "Today · 6:30 PM",
    status: "Scheduled",
    eventId: "evt-selena",
    imageUrl: events[0].imageUrl,
  },
  {
    id: "content-2",
    title: "Domingo brunch menu reveal",
    channel: "Instagram Story",
    scheduledFor: "Tomorrow · 10:00 AM",
    status: "Scheduled",
    eventId: "evt-brunch",
    imageUrl: events[1].imageUrl,
  },
  {
    id: "content-3",
    title: "Banda artist spotlight",
    channel: "Instagram",
    scheduledFor: "Needs a new publish time",
    status: "Needs Attention",
    eventId: "evt-banda",
    imageUrl: events[2].imageUrl,
  },
];

export const customers: Customer[] = [
  { id: "cus-1", name: "Marisol Vega", email: "marisol@example.com", phone: "", visits: 9, spend: 486, lastSeen: "Aug 9", source: "Instagram", tags: ["Live music", "VIP"] },
  { id: "cus-2", name: "Daniel Ruiz", email: "daniel@example.com", phone: "", visits: 6, spend: 272, lastSeen: "Aug 16", source: "Oasis Links", tags: ["Brunch"] },
  { id: "cus-3", name: "Ana & Luis Torres", email: "torres@example.com", phone: "", visits: 12, spend: 804, lastSeen: "Aug 15", source: "Friend", tags: ["Regular", "Banda"] },
  { id: "cus-4", name: "Camila Flores", email: "camila@example.com", phone: "", visits: 3, spend: 164, lastSeen: "Jul 28", source: "Google", tags: ["Paint & Sip"] },
];

export const guests: Guest[] = [
  { id: "guest-1", name: "Isabel Moreno", partySize: 2, type: "Comp", status: "Expected", note: "Birthday — welcome drink" },
  { id: "guest-2", name: "Los Primos Media", partySize: 3, type: "Guest", status: "Expected", promoter: "Rico" },
  { id: "guest-3", name: "DJ Mariposa", partySize: 2, type: "Artist", status: "Checked In" },
  { id: "guest-4", name: "Nico Santos", partySize: 1, type: "Staff", status: "Checked In" },
];

export function getEventBySlug(slug: string) {
  return events.find((event) => event.slug === slug || event.id === slug);
}

export function formatEventDate(date: string, format: "short" | "long" = "long") {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: format === "long" ? "long" : "short",
    month: format === "long" ? "long" : "short",
    day: "numeric",
    year: format === "long" ? "numeric" : undefined,
  }).format(new Date(`${date}T12:00:00Z`));
}

export function currency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}
