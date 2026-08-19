import Link from "next/link";

export default function NotFound() {
  return (
    <main className="centered-page">
      <span className="kicker">404</span>
      <h1>That page wandered off.</h1>
      <p>Let’s get you back to today’s work.</p>
      <Link className="button button-primary" href="/admin">Go to Today</Link>
    </main>
  );
}
