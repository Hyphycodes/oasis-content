import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";

export default function LoginPage() {
  return (
    <main className="login-page">
      <div className="login-art"><div className="login-art-copy"><span>Oasis operations</span><h1>One place for every good night.</h1><p>Create the event once. Oasis takes care of where it goes next.</p></div></div>
      <section className="login-panel">
        <div className="login-card">
          <Logo />
          <div><span className="kicker">Welcome back</span><h2>Sign in to Oasis</h2><p>Events, tickets, guests, and content are ready when you are.</p></div>
          <Suspense><LoginForm /></Suspense>
          {!process.env.NEXT_PUBLIC_SUPABASE_URL && <a className="preview-entry" href="/admin">Open the preview workspace →</a>}
        </div>
      </section>
    </main>
  );
}
