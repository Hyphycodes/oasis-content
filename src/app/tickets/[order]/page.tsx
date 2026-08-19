import {
  CalendarPlus,
  Check,
  Clock3,
  Download,
  MapPin,
  Ticket,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";
import { events, formatEventDate } from "@/lib/demo-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Your Oasis Tickets",
  robots: { index: false, follow: false },
};

export default async function TicketWalletPage({
  params,
}: {
  params: Promise<{ order: string }>;
}) {
  const { order } = await params;
  if (order !== "oasis-demo-order-7K4P9M" && order.length < 24) notFound();
  const admin = createSupabaseAdminClient();
  let event = events[0];
  let orderNumber = "OA-2819443";
  let tickets = [
    { code: "7K4P9M-A", status: "valid", name: "General admission" },
    { code: "7K4P9M-B", status: "valid", name: "General admission" },
  ];
  if (admin) {
    const { data: liveOrder } = await admin
      .from("orders")
      .select("id,order_number,event_id")
      .eq("secure_order_token", order)
      .in("status", ["paid", "partially_refunded", "refunded"])
      .maybeSingle();
    if (!liveOrder) notFound();
    const [{ data: liveEvent }, { data: liveTickets }] = await Promise.all([
      admin
        .from("events")
        .select(
          "id,slug,title,eyebrow,short_description,description,starts_at,ends_at,doors_at,hero_image_url,hero_image_alt,age_restriction,primary_location_id",
        )
        .eq("id", liveOrder.event_id)
        .single(),
      admin
        .from("tickets")
        .select("code,status,ticket_types(name)")
        .eq("order_id", liveOrder.id)
        .order("created_at"),
    ]);
    if (!liveEvent || !liveTickets?.length) notFound();
    const { data: location } = liveEvent.primary_location_id
      ? await admin
          .from("locations")
          .select("name,address")
          .eq("id", liveEvent.primary_location_id)
          .single()
      : { data: null };
    const startsAt = new Date(liveEvent.starts_at);
    const endsAt = new Date(liveEvent.ends_at);
    event = {
      ...events[0],
      id: liveEvent.id,
      slug: liveEvent.slug,
      title: liveEvent.title,
      eyebrow: liveEvent.eyebrow ?? "Oasis presents",
      shortDescription: liveEvent.short_description ?? "",
      description: liveEvent.description ?? "",
      date: startsAt.toISOString().slice(0, 10),
      startsAt: startsAt.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
      endsAt: endsAt.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
      doorsAt: liveEvent.doors_at
        ? new Date(liveEvent.doors_at).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })
        : "Doors open soon",
      imageUrl: liveEvent.hero_image_url ?? events[0].imageUrl,
      imageAlt: liveEvent.hero_image_alt ?? `${liveEvent.title} event artwork`,
      locationId: liveEvent.primary_location_id ?? "",
      locationName: location?.name ?? "Oasis",
      address: location?.address ?? "",
      ageRestriction: liveEvent.age_restriction ?? undefined,
    };
    orderNumber = liveOrder.order_number;
    tickets = liveTickets.map((ticket) => {
      const typeValue = ticket.ticket_types as
        { name?: string } | { name?: string }[] | null;
      const type = Array.isArray(typeValue) ? typeValue[0] : typeValue;
      return {
        code: ticket.code,
        status: ticket.status,
        name: type?.name ?? "Admission",
      };
    });
  } else if (order !== "oasis-demo-order-7K4P9M") notFound();
  return (
    <main className="wallet-page">
      <header className="wallet-header">
        <Logo href="/" />
        <span>Order {orderNumber}</span>
      </header>
      <section className="wallet-celebration">
        <span className="wallet-check">
          <Check />
        </span>
        <span className="kicker">You’re going</span>
        <h1>{event.title}</h1>
        <p>
          Your tickets are ready. Save this page or open it from your
          confirmation email.
        </p>
      </section>
      <section className="wallet-event panel">
        <div className="wallet-event-image">
          <Image
            src={event.imageUrl}
            alt={event.imageAlt}
            fill
            sizes="(max-width: 700px) 100vw, 320px"
          />
        </div>
        <div>
          <span className="eyebrow">{event.eyebrow}</span>
          <h2>{event.title}</h2>
          <p>
            <CalendarPlus />
            {formatEventDate(event.date)}
          </p>
          <p>
            <Clock3 />
            Doors {event.doorsAt} · Starts {event.startsAt}
          </p>
          <p>
            <MapPin />
            {event.locationName}
          </p>
          <small>{event.address}</small>
        </div>
      </section>
      <section className="wallet-tickets">
        <div className="wallet-section-title">
          <div>
            <span className="kicker">
              {tickets.length}{" "}
              {tickets.length === 1 ? "admission" : "admissions"}
            </span>
            <h2>Your tickets</h2>
          </div>
          <button className="button button-secondary">
            <Download />
            Save tickets
          </button>
        </div>
        <div className="ticket-wallet-grid">
          {tickets.map((ticket, index) => (
            <article className="wallet-ticket" key={ticket.code}>
              <div className="ticket-tear">
                <span />
              </div>
              <span className="ticket-number">
                Ticket {index + 1} of {tickets.length}
              </span>
              <Image
                src={`/api/tickets/qr?token=${ticket.code}`}
                alt={`QR code for ticket ${index + 1}`}
                width={220}
                height={220}
                unoptimized
              />
              <strong>{ticket.name}</strong>
              <small>{ticket.code}</small>
              <span
                className={`wallet-valid ${ticket.status !== "valid" ? "inactive" : ""}`}
              >
                <Check />
                {ticket.status === "valid"
                  ? "Ready to scan"
                  : ticket.status === "checked_in"
                    ? "Already checked in"
                    : "No longer valid"}
              </span>
            </article>
          ))}
        </div>
      </section>
      <section className="wallet-actions">
        <a
          className="button button-primary"
          href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}`}
          target="_blank"
        >
          <CalendarPlus />
          Add to calendar
        </a>
        <a
          className="button button-secondary"
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`}
          target="_blank"
        >
          <MapPin />
          Get directions
        </a>
      </section>
      <footer className="wallet-footer">
        <Ticket />
        <span>
          <strong>Need help?</strong>
          <small>
            Reply to your Oasis confirmation email and our team will take care
            of you.
          </small>
        </span>
        <Link href={`/e/${event.slug}`}>Event details →</Link>
      </footer>
    </main>
  );
}
