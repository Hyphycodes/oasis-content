"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    if (navigator.share) await navigator.share({ title, url: window.location.href });
    else {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  }
  return <button type="button" className="icon-button" aria-label={copied ? "Event link copied" : "Share event"} onClick={share}>{copied ? <Check /> : <Share2 />}</button>;
}
