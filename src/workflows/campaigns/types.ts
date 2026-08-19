export type ScheduledCampaignPost = { id: string; scheduledFor: string; destination: "instagram" | "facebook" | "google_business" | "website"; copy: string; mediaUrl?: string; eventUrl: string; title: string; startsAt: string; endsAt: string };
export type CampaignWorkflowPayload = { scheduleId: string; posts: ScheduledCampaignPost[] };
