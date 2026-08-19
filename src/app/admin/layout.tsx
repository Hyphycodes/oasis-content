import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";
import { getCurrentProfile } from "@/lib/data";
import { hasSupabaseEnvironment } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  return (
    <AppShell profile={profile} preview={!hasSupabaseEnvironment()}>
      {children}
    </AppShell>
  );
}
