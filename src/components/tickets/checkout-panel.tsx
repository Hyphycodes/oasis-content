"use client";

import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import {
  ArrowLeft,
  Check,
  LoaderCircle,
  LockKeyhole,
  Ticket,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { OasisEvent } from "@/lib/types";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

export function CheckoutPanel({ event }: { event: OasisEvent }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [quantity, setQuantity] = useState(() =>
    Math.min(8, Math.max(1, Number(searchParams.get("quantity")) || 2)),
  );
  const ticketTypes = event.ticketTypes?.length
    ? event.ticketTypes
    : [
        {
          id: "preview-general-admission",
          name: "General admission",
          price: event.price,
          capacity: event.capacity,
          sold: event.sold,
          minPerOrder: 1,
          maxPerOrder: 8,
        },
      ];
  const [ticketTypeId, setTicketTypeId] = useState(
    () => searchParams.get("ticketType") ?? ticketTypes[0].id,
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const ticketType =
    ticketTypes.find((ticket) => ticket.id === ticketTypeId) ?? ticketTypes[0];
  const total = ticketType.price * quantity;
  const options = useMemo(() => ({ clientSecret }), [clientSecret]);

  async function continueToPayment(eventSubmit: React.FormEvent) {
    eventSubmit.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: event.slug,
          ticketTypeId,
          quantity,
          name,
          email,
          phone,
          ref: searchParams.get("ref") ?? undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (result.redirectUrl) {
        router.push(result.redirectUrl);
        return;
      }
      setClientSecret(result.clientSecret);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Checkout didn’t start. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (clientSecret && stripePromise)
    return (
      <div className="embedded-checkout">
        <button className="checkout-back" onClick={() => setClientSecret("")}>
          <ArrowLeft />
          Back to details
        </button>
        <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    );

  return (
    <form className="checkout-form panel" onSubmit={continueToPayment}>
      <span className="kicker">Oasis tickets</span>
      <h2>Who’s going?</h2>
      <p>
        We’ll send all tickets to this email. You can add attendee names later.
      </p>
      {ticketTypes.length > 1 && (
        <label className="field">
          <span>Ticket type</span>
          <select
            value={ticketTypeId}
            onChange={(e) => {
              setTicketTypeId(e.target.value);
              setQuantity(1);
            }}
          >
            {ticketTypes.map((ticket) => (
              <option value={ticket.id} key={ticket.id}>
                {ticket.name} · {ticket.price ? `$${ticket.price}` : "Free"}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="checkout-ticket-row">
        <span className="ticket-icon">
          <Ticket />
        </span>
        <span>
          <strong>{ticketType.name}</strong>
          <small>
            {event.ageRestriction ?? "All ages"} ·{" "}
            {ticketType.price ? `$${ticketType.price} each` : "Free RSVP"}
          </small>
        </span>
        <label>
          <span className="sr-only">Quantity</span>
          <select
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          >
            {Array.from(
              { length: Math.min(10, ticketType.maxPerOrder) },
              (_, index) => index + 1,
            )
              .filter((value) => value >= ticketType.minPerOrder)
              .map((value) => (
                <option key={value}>{value}</option>
              ))}
          </select>
        </label>
      </div>
      <div className="form-grid checkout-fields">
        <label className="field field-wide">
          <span>Full name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </label>
        <label className="field field-wide">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label className="field field-wide">
          <span>
            Phone <i>optional</i>
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </label>
      </div>
      <div className="checkout-total">
        <span>Total</span>
        <strong>${total}</strong>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button public-ticket-button" disabled={loading}>
        {loading ? (
          <LoaderCircle className="spin" />
        ) : (
          <>
            <LockKeyhole />
            Continue to secure payment
          </>
        )}
      </button>
      <div className="checkout-trust">
        <span>
          <Check />
          Oasis confirmation
        </span>
        <span>
          <Check />
          Mobile tickets
        </span>
        <span>
          <Check />
          Secure Stripe payment
        </span>
      </div>
    </form>
  );
}
