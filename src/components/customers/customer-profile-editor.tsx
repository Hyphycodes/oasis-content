"use client";

import { Check, LoaderCircle, Pencil, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CustomerDetail } from "@/lib/types";

export function CustomerProfileEditor({
  customer,
}: {
  customer: CustomerDetail;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone,
    emailConsent: customer.emailConsent,
    smsConsent: customer.smsConsent,
    notes: customer.notes,
  });

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "The customer could not be saved.");
      setNotice(
        `Customer saved${data.mode === "preview" ? " in preview mode" : ""}.`,
      );
      setOpen(false);
      router.refresh();
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "The customer could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="customer-edit-action">
        {notice && (
          <span className="inline-notice" role="status">
            <Check />
            {notice}
          </span>
        )}
        <button
          type="button"
          className="button button-secondary"
          onClick={() => setOpen(true)}
        >
          <Pencil />
          Edit details
        </button>
      </div>
      {open && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setOpen(false);
          }}
        >
          <form className="quick-guest-modal" onSubmit={save}>
            <header>
              <div>
                <span className="kicker">Customer record</span>
                <h2>Edit details</h2>
                <p>Contact, consent, and internal notes for this guest.</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <X />
              </button>
            </header>
            <div className="form-grid">
              <label className="field">
                <span>First name</span>
                <input
                  value={form.firstName}
                  onChange={(event) =>
                    setForm({ ...form, firstName: event.target.value })
                  }
                />
              </label>
              <label className="field">
                <span>Last name</span>
                <input
                  value={form.lastName}
                  onChange={(event) =>
                    setForm({ ...form, lastName: event.target.value })
                  }
                />
              </label>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                />
              </label>
              <label className="field">
                <span>Phone</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                />
              </label>
            </div>
            <div className="customer-consent-fields">
              <label>
                <input
                  type="checkbox"
                  checked={form.emailConsent}
                  onChange={(event) =>
                    setForm({ ...form, emailConsent: event.target.checked })
                  }
                />
                Email marketing consent
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={form.smsConsent}
                  onChange={(event) =>
                    setForm({ ...form, smsConsent: event.target.checked })
                  }
                />
                SMS marketing consent
              </label>
            </div>
            <label className="field">
              <span>
                Internal notes <i>manager-only</i>
              </span>
              <textarea
                rows={4}
                value={form.notes}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
                }
                placeholder="Preferences or context the team should remember…"
              />
            </label>
            <button className="button button-primary" disabled={busy}>
              {busy ? <LoaderCircle className="spin" /> : <Save />}
              Save customer
            </button>
          </form>
        </div>
      )}
    </>
  );
}
