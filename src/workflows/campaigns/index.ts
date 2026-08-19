import { sleep } from "workflow";
import { finishCampaignStep, publishScheduledPostStep } from "@/workflows/campaigns/steps";
import type { CampaignWorkflowPayload } from "@/workflows/campaigns/types";

export async function campaignScheduleWorkflow(payload: CampaignWorkflowPayload) {
  "use workflow";
  const posts = [...payload.posts].sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
  for (const post of posts) {
    const dueAt = new Date(post.scheduledFor);
    if (dueAt.getTime() > Date.now()) await sleep(dueAt);
    try { await publishScheduledPostStep(post); } catch { /* a failed destination remains retryable without cancelling later posts */ }
  }
  return finishCampaignStep(payload.scheduleId);
}
