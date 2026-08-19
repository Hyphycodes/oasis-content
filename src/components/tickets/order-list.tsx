"use client";

import {
  ArrowDownToLine,
  Check,
  ChevronRight,
  LoaderCircle,
  ReceiptText,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { StatusPill } from "@/components/ui";
import { currency } from "@/lib/demo-data";

export type OrderSummary = {
  id: string;
  number: string;
  customer: string;
  email: string;
  event: string;
  items: string;
  total: number;
  time: string;
  status: string;
};

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function OrderList({
  orders,
  eventNames,
}: {
  orders: OrderSummary[];
  eventNames: string[];
}) {
  const [orderState, setOrderState] = useState(orders);
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<OrderSummary | null>(null);
  const [kind, setKind] = useState<"full" | "partial">("full");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const visibleOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orderState.filter((order) => {
      const matchesSearch =
        !query ||
        [order.customer, order.email, order.number, order.event]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesEvent = eventFilter === "all" || order.event === eventFilter;
      const refunded = /refund/i.test(order.status);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "refunded" ? refunded : !refunded);
      return matchesSearch && matchesEvent && matchesStatus;
    });
  }, [eventFilter, orderState, search, statusFilter]);

  function exportOrders() {
    const rows = [
      ["Order", "Customer", "Email", "Event", "Items", "Total", "Status"],
      ...visibleOrders.map((order) => [
        order.number,
        order.customer,
        order.email,
        order.event,
        order.items,
        order.total,
        order.status,
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `oasis-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function refund() {
    if (!selected) return;
    setBusy(true);
    setNotice("");
    try {
      const amountCents =
        kind === "partial" ? Math.round(Number(amount) * 100) : undefined;
      const response = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selected.id,
          amountCents,
          reason,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "The refund could not be completed.");
      const nextStatus = kind === "full" ? "Refunded" : "Partially refunded";
      setOrderState((current) =>
        current.map((order) =>
          order.id === selected.id ? { ...order, status: nextStatus } : order,
        ),
      );
      setNotice(
        `${currency(data.refund.amountCents / 100)} refunded${data.mode === "preview" ? " in preview mode" : ""}.`,
      );
      setSelected(null);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "The refund could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="orders-toolbar">
        <label className="collection-search">
          <Search />
          <input
            aria-label="Search orders"
            placeholder="Search name, email, event, or order"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <select
          aria-label="Filter orders by event"
          value={eventFilter}
          onChange={(event) => setEventFilter(event.target.value)}
        >
          <option value="all">All events</option>
          {eventNames.map((name) => (
            <option value={name} key={name}>
              {name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter orders by status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="paid">Paid / confirmed</option>
          <option value="refunded">Refunded</option>
        </select>
        <button
          type="button"
          className="button button-secondary"
          onClick={exportOrders}
          disabled={!visibleOrders.length}
        >
          <ArrowDownToLine />
          Export
        </button>
      </div>
      {notice && (
        <div className="upload-notice" role="status">
          <Check />
          {notice}
        </div>
      )}
      {visibleOrders.length ? (
        <div className="orders-list">
          {visibleOrders.map((order) => (
            <button
              type="button"
              onClick={() => {
                setSelected(order);
                setReason("");
                setAmount("");
                setNotice("");
                setKind("full");
              }}
              key={order.number}
            >
              <span className="order-icon">
                <ReceiptText />
              </span>
              <span>
                <strong>{order.customer}</strong>
                <small>{order.email}</small>
              </span>
              <span>
                <strong>{order.event}</strong>
                <small>{order.items}</small>
              </span>
              <span>
                <strong>{currency(order.total)}</strong>
                <small>{order.time}</small>
              </span>
              <StatusPill status={order.status} />
              <ChevronRight />
            </button>
          ))}
        </div>
      ) : (
        <div className="panel collection-empty">
          <ReceiptText />
          <h2>No orders match this view.</h2>
          <p>Change the search, event, or status filter.</p>
        </div>
      )}
      {selected && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <section
            className="refund-modal panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="refund-title"
          >
            <header>
              <div>
                <span className="kicker">Order {selected.number}</span>
                <h2 id="refund-title">Refund {selected.customer}</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setSelected(null)}
                aria-label="Close refund"
              >
                <X />
              </button>
            </header>
            <div className="refund-order-summary">
              <span>
                <strong>{selected.event}</strong>
                <small>{selected.items}</small>
              </span>
              <strong>{currency(selected.total)}</strong>
            </div>
            <fieldset className="refund-kind">
              <legend>Refund amount</legend>
              <button
                type="button"
                className={kind === "full" ? "selected" : ""}
                onClick={() => setKind("full")}
              >
                <strong>Full refund</strong>
                <small>{currency(selected.total)}</small>
              </button>
              <button
                type="button"
                className={kind === "partial" ? "selected" : ""}
                onClick={() => setKind("partial")}
              >
                <strong>Partial refund</strong>
                <small>Choose an amount</small>
              </button>
            </fieldset>
            {kind === "partial" && (
              <label className="field">
                <span>Amount</span>
                <div className="input-prefix">
                  <span>$</span>
                  <input
                    type="number"
                    min="0.01"
                    max={selected.total}
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </div>
              </label>
            )}
            <label className="field">
              <span>Reason</span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                placeholder="What happened?"
              />
            </label>
            <p className="refund-warning">
              Refunded tickets stop working at the door. Capacity is returned
              automatically.
            </p>
            <footer>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setSelected(null)}
              >
                Keep order
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={refund}
                disabled={
                  busy ||
                  reason.trim().length < 3 ||
                  (kind === "partial" &&
                    (!Number(amount) || Number(amount) > selected.total))
                }
              >
                {busy ? <LoaderCircle className="spin" /> : <RotateCcw />}
                Confirm refund
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
