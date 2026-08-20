import { SettingsHub } from "@/components/settings/settings-hub";
import { PageHeader } from "@/components/ui";
import {
  getBusinessSettings,
  getLocations,
  getTeamMembers,
} from "@/lib/data";
import { getEnvironmentReadiness } from "@/lib/env";

export default async function SettingsPage() {
  const [locations, team, business] = await Promise.all([
    getLocations(),
    getTeamMembers(),
    getBusinessSettings(),
  ]);
  const readiness = getEnvironmentReadiness();
  const integrations = [
    {
      name: "Stripe",
      key: "stripe",
      description: "Payments, refunds, and ticket checkout",
      connected: Boolean(
        process.env.STRIPE_SECRET_KEY &&
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
          process.env.STRIPE_WEBHOOK_SECRET,
      ),
    },
    {
      name: "Instagram & Facebook",
      key: "meta",
      description: "Posts, stories, reels, and Page publishing",
      connected: readiness.integrations.meta.configured,
    },
    {
      name: "Google Business",
      key: "google_business",
      description: "Location posts and event updates",
      connected: readiness.integrations.googleBusiness.configured,
    },
    {
      name: "Google Drive",
      key: "google_drive",
      description: "Original creative and event archive",
      connected: readiness.integrations.googleDrive.configured,
    },
    {
      name: "Resend",
      key: "resend",
      description: "Ticket and staff email",
      connected: Boolean(
        process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL,
      ),
    },
    {
      name: "OpenAI",
      key: "openai",
      description: "Editable campaign copy drafts",
      connected: readiness.integrations.openai.configured,
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Owner / Admin"
        title="Settings"
        description="Business defaults, team access, and connection health—kept away from everyday work."
      />
      <SettingsHub
        integrations={integrations}
        locations={locations}
        team={team}
        initialBusiness={business}
      />
    </>
  );
}
