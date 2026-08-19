"use client";

import { LoaderCircle, RotateCcw } from "lucide-react";
import { useState } from "react";

export function RetryPublishButton({ eventId, destination }: { eventId: string; destination: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "queued" | "error">("idle");
  async function retry() {
    setStatus("loading");
    try {
      const response = await fetch("/api/publish/retry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, destination }) });
      setStatus(response.ok ? "queued" : "error");
    } catch { setStatus("error"); }
  }
  return <button className={`retry-button ${status}`} onClick={retry} disabled={status === "loading" || status === "queued"}>{status === "loading" ? <LoaderCircle className="spin" /> : <RotateCcw />}{status === "queued" ? "Queued" : status === "error" ? "Try again" : "Retry"}</button>;
}
