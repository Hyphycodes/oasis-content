"use client";

import { Check, LoaderCircle, Mail } from "lucide-react";
import { useState } from "react";

export function WaitlistForm({ slug }: { slug: string }) {
  const [email, setEmail] = useState("");
  const [quantity, setQuantity] = useState(2);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function join(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, email, quantity }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The waitlist could not be updated.");
      setNotice(data.alreadyJoined ? "You’re already on the list. We’ll keep your spot." : "You’re on the list. We’ll email if space opens.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The waitlist could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  if (notice) return <div className="waitlist-success" role="status"><Check />{notice}</div>;
  return <form className="waitlist-form" onSubmit={join}><label><span>Email</span><div><Mail /><input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div></label><label><span>Party size</span><select value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}>{[1,2,3,4,5,6,7,8].map((value) => <option key={value}>{value}</option>)}</select></label><button className="button public-ticket-button" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <><Mail />Join the waitlist</>}</button></form>;
}
