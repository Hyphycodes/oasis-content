import {
  ChevronRight,
  Plus,
  ReceiptText,
  Ticket,
  TrendingUp,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PageHeader, StatusPill } from "@/components/ui";
import { OrderList } from "@/components/tickets/order-list";
import { getEvents, getOrders } from "@/lib/data";
import { currency, events as demoEvents } from "@/lib/demo-data";

const demoOrders = [
  {
    id: "OA-2819443",
    number: "OA-2819443",
    customer: "Marisol Vega",
    email: "marisol@example.com",
    event: "Selena Forever",
    items: "2 × General admission",
    total: 36,
    time: "12 min ago",
    status: "Paid",
  },
  {
    id: "OA-2819418",
    number: "OA-2819418",
    customer: "Javier Luna",
    email: "javier@example.com",
    event: "Banda Bajo Las Estrellas",
    items: "1 × Early bird",
    total: 25,
    time: "48 min ago",
    status: "Paid",
  },
  {
    id: "OA-2819342",
    number: "OA-2819342",
    customer: "Ana Torres",
    email: "ana@example.com",
    event: "Selena Forever",
    items: "2 × Couples ticket",
    total: 52,
    time: "Today · 10:14 AM",
    status: "Paid",
  },
  {
    id: "OA-2819004",
    number: "OA-2819004",
    customer: "Mateo Diaz",
    email: "mateo@example.com",
    event: "Domingo Brunch Social",
    items: "4 × RSVP",
    total: 0,
    time: "Yesterday",
    status: "Confirmed",
  },
];

export default async function TicketsPage() {
  const [liveOrders, events] = await Promise.all([getOrders(), getEvents()]);
  const orders = liveOrders ?? demoOrders;
  const visibleEvents = liveOrders === null ? demoEvents : events;
  return (
    <>
      <PageHeader
        eyebrow="Owned by Oasis"
        title="Tickets"
        description="Sales, orders, refunds, and capacity—without needing to open Stripe."
        actions={
          <Link className="button button-primary" href="/admin/guests">
            <Plus />
            Manage comps
          </Link>
        }
      />
      <section className="ticket-metric-grid">
        <div>
          <span>
            <TrendingUp />
          </span>
          <strong>
            {currency(visibleEvents.reduce((sum, e) => sum + e.revenue, 0))}
          </strong>
          <small>Gross event sales</small>
          <em>Across active events</em>
        </div>
        <div>
          <span>
            <Ticket />
          </span>
          <strong>{visibleEvents.reduce((sum, e) => sum + e.sold, 0)}</strong>
          <small>Tickets & RSVPs</small>
          <em>First-party records</em>
        </div>
        <div>
          <span>
            <ReceiptText />
          </span>
          <strong>
            {currency(
              orders.length
                ? orders.reduce((sum, order) => sum + order.total, 0) /
                    orders.length
                : 0,
            )}
          </strong>
          <small>Average order</small>
          <em>Across recent orders</em>
        </div>
      </section>
      <section className="ticket-event-strip">
        {visibleEvents.slice(0, 3).map((event) => (
          <Link href={`/admin/events/${event.id}?tab=Tickets`} key={event.id}>
            <Image src={event.imageUrl} alt="" width={52} height={52} />
            <span>
              <strong>{event.title}</strong>
              <small>
                {event.sold} / {event.capacity} · {currency(event.revenue)}
              </small>
            </span>
            <StatusPill status={event.ticketStatus} />
            <ChevronRight />
          </Link>
        ))}
      </section>
      <section className="orders-section">
        <div className="section-heading">
          <div>
            <h2>Recent orders</h2>
            <p>Payments and reservations from every event.</p>
          </div>
        </div>
        {orders.length ? (
          <OrderList
            orders={orders}
            eventNames={visibleEvents.map((event) => event.title)}
          />
        ) : (
          <div className="panel collection-empty">
            <ReceiptText />
            <h2>No orders yet.</h2>
            <p>Paid tickets and RSVPs will appear here.</p>
          </div>
        )}
      </section>
    </>
  );
}
