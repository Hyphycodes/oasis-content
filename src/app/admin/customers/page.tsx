import { UsersRound } from "lucide-react";
import { CustomerManager } from "@/components/customers/customer-manager";
import { PageHeader } from "@/components/ui";
import { currency } from "@/lib/demo-data";
import { getCustomers } from "@/lib/data";
import type { Customer } from "@/lib/types";

export default async function CustomersPage() {
  const customers: Customer[] = await getCustomers();
  const totalSpend = customers.reduce(
    (sum, customer) => sum + customer.spend,
    0,
  );
  return (
    <>
      <PageHeader
        eyebrow="Your first-party audience"
        title="Customers"
        description="Understand who buys, who attends, and what keeps them coming back."
      />
      <section className="customer-insights">
        <div>
          <span className="kicker">Known customers</span>
          <strong>{customers.length.toLocaleString()}</strong>
          <small>Built from Oasis orders and RSVPs</small>
        </div>
        <div>
          <span className="kicker">Audience value</span>
          <strong>{currency(totalSpend)}</strong>
          <small>Ticket spend in this view</small>
        </div>
        <div>
          <span className="kicker">Repeat guests</span>
          <strong>
            {customers.length
              ? Math.round(
                  (customers.filter((customer) => customer.visits >= 3).length /
                    customers.length) *
                    100,
                )
              : 0}
            %
          </strong>
          <small>Have attended 3+ events</small>
        </div>
      </section>
      <CustomerManager customers={customers} />
      <div className="privacy-note">
        <UsersRound />
        <span>
          <strong>Customer details are manager-only.</strong>
          <small>Door staff see only what they need to check guests in.</small>
        </span>
      </div>
    </>
  );
}
