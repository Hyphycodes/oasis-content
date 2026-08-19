"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="centered-page">
      <span className="kicker">Something needs a minute</span>
      <h1>Oasis couldn’t load this page.</h1>
      <p>Your work is still safe. Try again, or come back in a moment.</p>
      <button className="button button-primary" onClick={reset}>Try again</button>
    </main>
  );
}
