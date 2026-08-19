import { SettingsHub } from "@/components/settings/settings-hub";
import { PageHeader } from "@/components/ui";
import { getLocations, getTeamMembers } from "@/lib/data";

export default async function SettingsPage() {
  const [locations, team] = await Promise.all([getLocations(), getTeamMembers()]);
  const integrations = [
    { name:"Stripe",key:"stripe",description:"Payments, refunds, and ticket checkout",connected:Boolean(process.env.STRIPE_SECRET_KEY) },
    { name:"Instagram & Facebook",key:"meta",description:"Posts, stories, reels, and Page publishing",connected:Boolean(process.env.META_ACCESS_TOKEN) },
    { name:"Google Business",key:"google_business",description:"Location posts and event updates",connected:Boolean(process.env.GOOGLE_BUSINESS_ACCESS_TOKEN) },
    { name:"Google Drive",key:"google_drive",description:"Original creative and event archive",connected:Boolean(process.env.GOOGLE_DRIVE_ACCESS_TOKEN) },
    { name:"Resend",key:"resend",description:"Ticket and staff email",connected:Boolean(process.env.RESEND_API_KEY) },
    { name:"OpenAI",key:"openai",description:"Editable campaign copy drafts",connected:Boolean(process.env.OPENAI_API_KEY) },
  ];
  return <><PageHeader eyebrow="Owner / Admin" title="Settings" description="Business defaults, team access, and connection health—kept away from everyday work." /><SettingsHub integrations={integrations} locations={locations} team={team}/></>;
}
