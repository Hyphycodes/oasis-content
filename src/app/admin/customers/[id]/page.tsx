import {
  ArrowLeft,
  CalendarDays,
  Eye,
  Link2,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  RotateCcw,
  ShoppingBag,
  Ticket,
  UserRoundCheck,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerProfileEditor } from "@/components/customers/customer-profile-editor";
import { StatusPill } from "@/components/ui";
import { currency } from "@/lib/demo-data";
import { getCustomerById } from "@/lib/data";
import type { CustomerActivity, CustomerDetail } from "@/lib/types";

const activityPresentation: Record<
  CustomerActivity["type"],
  { icon: typeof Ticket; tone: string }
> = {
  view: { icon: Eye, tone: "blue" },
  rsvp: { icon: CalendarDays, tone: "gold" },
  purchase: { icon: ShoppingBag, tone: "gold" },
  check_in: { icon: UserRoundCheck, tone: "green" },
  refund: { icon: RotateCcw, tone: "blue" },
  email_open: { icon: Mail, tone: "blue" },
  link_click: { icon: Link2, tone: "blue" },
};

function compactDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year:
      new Date(value).getFullYear() === new Date().getFullYear()
        ? undefined
        : "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = (await getCustomerById(id)) as CustomerDetail | null;
  if (!customer) notFound();
  return (
    <>
      <Link href="/admin/customers" className="back-link">
        <ArrowLeft />
        All customers
      </Link>
      <section className="customer-detail-head panel">
        <span className="customer-avatar-large">
          {customer.name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)}
        </span>
        <div>
          <span className="kicker">Oasis guest</span>
          <h1>{customer.name}</h1>
          <div>
            {customer.email && (
              <a href={`mailto:${customer.email}`}>
                <Mail />
                {customer.email}
              </a>
            )}
            {customer.phone && (
              <a href={`tel:${customer.phone}`}>
                <Phone />
                {customer.phone}
              </a>
            )}
          </div>
        </div>
        <div className="customer-consent">
          <StatusPill
            status={customer.emailConsent ? "Email OK" : "Email Off"}
          />
          <StatusPill status={customer.smsConsent ? "SMS OK" : "SMS Off"} />
        </div>
        <CustomerProfileEditor customer={customer} />
      </section>
      <section className="customer-detail-metrics">
        <div>
          <strong>{currency(customer.spend)}</strong>
          <span>Ticket spend</span>
        </div>
        <div>
          <strong>{customer.visits}</strong>
          <span>Events attended</span>
        </div>
        <div>
          <strong>{customer.ticketsPurchased}</strong>
          <span>Tickets purchased</span>
        </div>
        <div>
          <strong>{customer.showRate}%</strong>
          <span>Show rate</span>
        </div>
      </section>
      <div className="customer-detail-grid">
        <section className="panel activity-panel">
          <div className="panel-title">
            <div>
              <span className="kicker">What happened</span>
              <h2>Activity</h2>
            </div>
          </div>
          <div className="activity-timeline">
            {customer.activity.map((item) => {
              const presentation = activityPresentation[item.type];
              const Icon = presentation.icon;
              return (
                <div key={item.id}>
                  <span className={`activity-icon ${presentation.tone}`}>
                    <Icon />
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </span>
                  <time>
                    {compactDate(item.occurredAt)}
                    {item.value !== undefined && ` · ${currency(item.value)}`}
                  </time>
                </div>
              );
            })}
            {!customer.activity.length && (
              <div className="collection-empty">
                <ReceiptText />
                <p>
                  Purchases, RSVPs, check-ins, and refunds will appear here.
                </p>
              </div>
            )}
          </div>
        </section>
        <aside>
          <section className="panel customer-about">
            <span className="kicker">About this guest</span>
            <dl>
              <div>
                <dt>First seen</dt>
                <dd>{compactDate(customer.createdAt)}</dd>
              </div>
              <div>
                <dt>Last activity</dt>
                <dd>{customer.lastSeen}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{customer.source}</dd>
              </div>
              <div>
                <dt>RSVPs</dt>
                <dd>{customer.rsvpCount}</dd>
              </div>
            </dl>
            {customer.notes && (
              <p className="customer-note">{customer.notes}</p>
            )}
            <span className="customer-tags">
              {customer.tags.map((tag) => (
                <b key={tag}>{tag}</b>
              ))}
            </span>
          </section>
          <section className="panel customer-event-history">
            <span className="kicker">Event history</span>
            {customer.eventHistory.map((event) => (
              <div key={event.id}>
                <span>
                  <strong>{event.title}</strong>
                  <small>
                    <MapPin />
                    Oasis
                  </small>
                </span>
                <span>
                  <strong>
                    {event.amount ? currency(event.amount) : "RSVP"}
                  </strong>
                  <small>{event.status}</small>
                </span>
              </div>
            ))}
            {!customer.eventHistory.length && (
              <div className="collection-empty">
                <p>No purchased or RSVP events yet.</p>
              </div>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
