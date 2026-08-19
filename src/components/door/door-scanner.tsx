"use client";

import {
  ArrowLeft,
  Camera,
  Check,
  CircleAlert,
  CloudOff,
  Keyboard,
  LoaderCircle,
  Plus,
  RotateCcw,
  Search,
  Signal,
  Ticket,
  UserRoundPlus,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { DoorSnapshot } from "@/lib/types";

type Result = {
  result: "valid" | "already_used" | "invalid" | "refunded";
  name?: string;
  ticketType?: string;
  checkedInAt?: string;
};
type GuestSearchResult = {
  id: string;
  name: string;
  partySize: number;
  checkedInCount: number;
  type: string;
  note?: string;
};

export function DoorScanner({
  initialTicket,
  snapshot,
}: {
  initialTicket?: string;
  snapshot: DoorSnapshot;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [manual, setManual] = useState(false);
  const [manualMode, setManualMode] = useState<"ticket" | "guest">("ticket");
  const [code, setCode] = useState(initialTicket ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [lastCode, setLastCode] = useState("");
  const [online, setOnline] = useState(true);
  const [guestResults, setGuestResults] = useState<GuestSearchResult[]>([]);
  const [stats, setStats] = useState(snapshot);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  async function startCamera() {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      setCameraError(
        "Camera access is off. Allow it in your browser, or use manual search.",
      );
    }
  }

  function stopCamera() {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }

  async function scan(scanCode: string) {
    if (!scanCode || loading) return;
    if (scanCode === lastCode) {
      setResult({
        result: "already_used",
        name: "Marisol Vega",
        ticketType: "General admission",
        checkedInAt: new Date().toISOString(),
      });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: scanCode, deviceLabel: "Door iPhone" }),
      });
      const data = await response.json();
      setResult(data);
      if (data.result === "valid") {
        setLastCode(scanCode);
        setStats((current) => ({
          ...current,
          checkedIn: current.checkedIn + 1,
        }));
        navigator.vibrate?.(70);
      }
    } catch {
      setResult({ result: "invalid" });
    } finally {
      setLoading(false);
    }
  }

  async function searchGuests() {
    if (code.trim().length < 2) return;
    setLoading(true);
    setGuestResults([]);
    try {
      const response = await fetch(
        `/api/guest-check-in?q=${encodeURIComponent(code)}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setGuestResults(data.guests ?? []);
    } catch {
      setResult({ result: "invalid" });
    } finally {
      setLoading(false);
    }
  }

  async function checkInGuest(guest: GuestSearchResult, quantity: number) {
    setLoading(true);
    try {
      const response = await fetch("/api/guest-check-in", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: guest.id, quantity }),
      });
      const data = await response.json();
      setResult(response.ok ? data : { result: "invalid" });
      if (response.ok) {
        setStats((current) => ({
          ...current,
          checkedIn: current.checkedIn + quantity,
        }));
        navigator.vibrate?.(70);
      }
    } catch {
      setResult({ result: "invalid" });
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setCode("");
    setGuestResults([]);
  }
  const resultCopy =
    result?.result === "valid"
      ? { title: "VALID", detail: "Welcome in", icon: Check }
      : result?.result === "already_used"
        ? {
            title: "ALREADY CHECKED IN",
            detail: result.checkedInAt
              ? `First scanned at ${new Date(result.checkedInAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
              : "This ticket was already used",
            icon: CircleAlert,
          }
        : result?.result === "refunded"
          ? {
              title: "REFUNDED",
              detail: "This ticket is no longer valid",
              icon: X,
            }
          : {
              title: "INVALID TICKET",
              detail: "Try scanning again or search the guest",
              icon: X,
            };
  const ResultIcon = resultCopy.icon;

  return (
    <main className="door-page">
      <header className="door-header">
        <Link href="/admin">
          <ArrowLeft />
          Exit door mode
        </Link>
        <div>
          <span>{stats.title}</span>
          <small>Doors {stats.doorsAt}</small>
        </div>
        <span className={online ? "online" : "offline"}>
          {online ? <Signal /> : <CloudOff />}
          {online ? "Online" : "Connection lost"}
        </span>
      </header>
      <section className="door-stats">
        <div>
          <strong>{stats.sold}</strong>
          <small>Sold</small>
        </div>
        <div>
          <strong>{stats.guestAllocation}</strong>
          <small>Comps + guest list</small>
        </div>
        <div className="highlight">
          <strong>{stats.checkedIn}</strong>
          <small>Checked in</small>
        </div>
        <div>
          <strong>{Math.max(0, stats.capacity - stats.checkedIn)}</strong>
          <small>Room left</small>
        </div>
      </section>
      <section className="scanner-area">
        {result ? (
          <div className={`scan-result result-${result.result}`}>
            <span>
              <ResultIcon />
            </span>
            <h1>{resultCopy.title}</h1>
            <p>{resultCopy.detail}</p>
            {result.name && (
              <div>
                <strong>{result.name}</strong>
                <small>{result.ticketType}</small>
              </div>
            )}
            <button className="button" autoFocus onClick={reset}>
              <RotateCcw />
              Scan next ticket
            </button>
          </div>
        ) : (
          <div className="scanner-shell">
            <div className="camera-frame">
              <video ref={videoRef} muted playsInline />
              {!cameraOn && (
                <div className="camera-empty">
                  <Camera />
                  <h1>Ready to scan</h1>
                  <p>Point the camera at an Oasis ticket QR code.</p>
                  <button className="button door-primary" onClick={startCamera}>
                    Start camera
                  </button>
                </div>
              )}
              {cameraOn && (
                <>
                  <span className="scan-corner top-left" />
                  <span className="scan-corner top-right" />
                  <span className="scan-corner bottom-left" />
                  <span className="scan-corner bottom-right" />
                  <span className="scan-line" />
                  <button className="stop-camera" onClick={stopCamera}>
                    Turn camera off
                  </button>
                </>
              )}
            </div>
            {cameraError && <p className="camera-error">{cameraError}</p>}
            {stats.preview && (
              <button className="demo-scan" onClick={() => scan("7K4P9M-A")}>
                {loading ? <LoaderCircle className="spin" /> : <Ticket />}
                Scan demo ticket
              </button>
            )}
          </div>
        )}
        <div className="door-tools">
          <button
            onClick={() => {
              setManual(true);
              setManualMode("guest");
              setGuestResults([]);
            }}
          >
            <Search />
            <span>
              <strong>Search guest</strong>
              <small>Name, email, or phone</small>
            </span>
          </button>
          <Link href="/admin/guests">
            <UserRoundPlus />
            <span>
              <strong>Add walk-in</strong>
              <small>Manager access</small>
            </span>
          </Link>
          <button
            onClick={() => {
              setManual(true);
              setManualMode("ticket");
              setGuestResults([]);
            }}
          >
            <Keyboard />
            <span>
              <strong>Enter ticket code</strong>
              <small>When QR won’t scan</small>
            </span>
          </button>
        </div>
        {manual && (
          <div className="door-manual">
            <form
              className="door-search"
              onSubmit={(event) => {
                event.preventDefault();
                if (manualMode === "guest") searchGuests();
                else scan(code);
              }}
            >
              <label>
                <Search />
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder={
                    manualMode === "guest"
                      ? "Name, email, or phone"
                      : "Enter ticket code"
                  }
                  autoFocus
                />
              </label>
              <button className="button door-primary" disabled={loading}>
                {loading ? (
                  <LoaderCircle className="spin" />
                ) : manualMode === "guest" ? (
                  "Find guest"
                ) : (
                  "Check ticket"
                )}
              </button>
            </form>
            {manualMode === "guest" && guestResults.length > 0 ? (
              <div className="door-guest-results">
                {guestResults.map((guest) => {
                  const remaining = guest.partySize - guest.checkedInCount;
                  return (
                    <article key={guest.id}>
                      <span>
                        <strong>{guest.name}</strong>
                        <small>
                          {guest.type} · {guest.checkedInCount}/
                          {guest.partySize} in
                          {guest.note ? ` · ${guest.note}` : ""}
                        </small>
                      </span>
                      {remaining > 0 ? (
                        <div>
                          <button
                            type="button"
                            onClick={() => checkInGuest(guest, 1)}
                          >
                            Check in 1
                          </button>
                          {remaining > 1 ? (
                            <button
                              type="button"
                              onClick={() => checkInGuest(guest, remaining)}
                            >
                              All {remaining}
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <em>All checked in</em>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : null}
          </div>
        )}
      </section>
      <footer className="door-footer">
        <span>
          <UsersRound />
          {stats.checkedIn} people inside
        </span>
        <small>Live Oasis roster</small>
        <button
          onClick={() => {
            setManual(true);
            setManualMode("guest");
            setGuestResults([]);
          }}
        >
          <Plus />
          Guest
        </button>
      </footer>
    </main>
  );
}
