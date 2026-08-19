"use client";

import { ChevronRight, Download, Search, UsersRound } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { currency } from "@/lib/demo-data";
import type { Customer } from "@/lib/types";

type Segment = "all" | "repeat" | "high" | "brunch" | "nightlife";

const segmentLabels: { key: Segment; label: string }[] = [
  { key: "all", label: "All customers" },
  { key: "repeat", label: "3+ events" },
  { key: "high", label: "High spenders" },
  { key: "brunch", label: "Brunch" },
  { key: "nightlife", label: "Nightlife" },
];

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function CustomerManager({ customers }: { customers: Customer[] }) {
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<Segment>("all");
  const visibleCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return customers.filter((customer) => {
      const matchesSearch =
        !query ||
        [customer.name, customer.email, customer.phone, customer.source]
          .join(" ")
          .toLowerCase()
          .includes(query) ||
        customer.tags.some((tag) => tag.toLowerCase().includes(query));
      if (!matchesSearch) return false;
      if (segment === "repeat") return customer.visits >= 3;
      if (segment === "high") return customer.spend >= 250;
      if (segment === "brunch")
        return customer.tags.some((tag) => /brunch/i.test(tag));
      if (segment === "nightlife")
        return customer.tags.some((tag) => /night|banda|latin|dj/i.test(tag));
      return true;
    });
  }, [customers, search, segment]);

  function exportCustomers() {
    const rows = [
      ["Name", "Email", "Phone", "Visits", "Ticket spend", "Source", "Tags"],
      ...visibleCustomers.map((customer) => [
        customer.name,
        customer.email,
        customer.phone,
        customer.visits,
        customer.spend,
        customer.source,
        customer.tags.join("; "),
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `oasis-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="customer-toolbar">
        <label className="collection-search">
          <Search />
          <input
            aria-label="Search customers"
            placeholder="Search name, email, phone, or source"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="customer-segments" aria-label="Customer segment">
          {segmentLabels.map((item) => (
            <button
              type="button"
              className={segment === item.key ? "active" : ""}
              onClick={() => setSegment(item.key)}
              key={item.key}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="button button-secondary"
          onClick={exportCustomers}
          disabled={!visibleCustomers.length}
        >
          <Download />
          Export {visibleCustomers.length || ""}
        </button>
      </div>
      <section className="customer-list panel">
        <header>
          <span>Customer</span>
          <span>Last seen</span>
          <span>Visits</span>
          <span>Ticket spend</span>
          <span>Source</span>
          <span />
        </header>
        {visibleCustomers.map((customer) => (
          <Link href={`/admin/customers/${customer.id}`} key={customer.id}>
            <span className="customer-person">
              <i>
                {customer.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)}
              </i>
              <span>
                <strong>{customer.name}</strong>
                <small>{customer.email || customer.phone}</small>
                <em>
                  {customer.tags.map((tag) => (
                    <b key={tag}>{tag}</b>
                  ))}
                </em>
              </span>
            </span>
            <span>{customer.lastSeen}</span>
            <strong>{customer.visits}</strong>
            <strong>{currency(customer.spend)}</strong>
            <span>{customer.source}</span>
            <ChevronRight />
          </Link>
        ))}
        {!visibleCustomers.length && (
          <div className="collection-empty">
            <UsersRound />
            <h2>No customers match this view.</h2>
            <p>Try another search or audience segment.</p>
          </div>
        )}
      </section>
    </>
  );
}
