"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      router.push("/admin");
      return;
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError("That email and password didn’t match. Try again or ask an Oasis admin for help.");
      setLoading(false);
      return;
    }
    router.push(searchParams.get("next") ?? "/admin");
    router.refresh();
  }

  async function sendMagicLink() {
    setError(""); setNotice("");
    if (!email) { setError("Enter your email first, then request a sign-in link."); return; }
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setNotice("Preview mode does not send email. Use the preview workspace link below."); setLoading(false); return; }
    const { error: magicError } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}${searchParams.get("next") ?? "/admin"}` } });
    if (magicError) setError("Oasis couldn’t send the sign-in link. Try again.");
    else setNotice("Check your email for a secure sign-in link.");
    setLoading(false);
  }

  async function resetPassword() {
    setError(""); setNotice("");
    if (!email) { setError("Enter your email first, then request a password reset."); return; }
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setNotice("Password reset email is available after Supabase is connected."); setLoading(false); return; }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login?reset=1` });
    if (resetError) setError("Oasis couldn’t send the reset email. Try again.");
    else setNotice("Check your email for password reset instructions.");
    setLoading(false);
  }

  return (
    <form className="login-form" onSubmit={onSubmit}>
      <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@oasiskitchen.com" required autoComplete="email" /></label>
      <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" required autoComplete="current-password" /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="form-notice" role="status">{notice}</p>}
      <button className="button button-primary" type="submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={18} /> : <>Sign in<ArrowRight size={17} /></>}</button>
      <div className="login-alternatives"><button type="button" onClick={sendMagicLink} disabled={loading}>Email me a sign-in link</button><button type="button" onClick={resetPassword} disabled={loading}>Reset password</button></div>
    </form>
  );
}
