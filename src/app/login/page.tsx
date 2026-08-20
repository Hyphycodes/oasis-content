import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";
import { getWorkspaceMode } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const mode = getWorkspaceMode();
  return (
    <main className="login-page">
      <div className="login-art"><div className="login-art-copy"><span>Oasis operations</span><h1>One place for every good night.</h1><p>Create the event once. Oasis takes care of where it goes next.</p></div></div>
      <section className="login-panel">
        <div className="login-card">
          <Logo />
          <div><span className="kicker">Welcome back</span><h2>Sign in to Oasis</h2><p>Events, tickets, guests, and content are ready when you are.</p></div>
          {mode === "configuration_required" ? (
            <div className="form-notice" role="status">
              <strong>Setup needs to be finished.</strong>
              <span>
                Oasis Admin is protected and will not show sample business data
                in production. Ask the administrator managing this app to
                connect the secure database before staff sign in.
              </span>
            </div>
          ) : (
            <Suspense>
              <LoginForm />
            </Suspense>
          )}
          {mode === "preview" ? (
            <a className="preview-entry" href="/admin">
              Open the development preview →
            </a>
          ) : null}
        </div>
      </section>
    </main>
  );
}
