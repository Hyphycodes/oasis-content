import { FatalError } from "workflow";
import { publishGoogleBusinessEvent } from "@/lib/integrations/google-business";
import { createInstagramContainer, publishFacebookPost, publishInstagramContainer } from "@/lib/integrations/meta";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ScheduledCampaignPost } from "@/workflows/campaigns/types";

export async function publishScheduledPostStep(post: ScheduledCampaignPost) {
  "use step";
  const admin = createSupabaseAdminClient();
  if (!admin) throw new FatalError("Supabase service role is not configured");
  const { data: record } = await admin.from("scheduled_posts").select("status,external_id,attempt_count,campaign_schedule_id").eq("id", post.id).single();
  if (record?.status === "succeeded") return { id: post.id, status: "succeeded" };
  if (record?.status === "disabled") return { id: post.id, status: "disabled" };
  const { data: schedule } = record ? await admin.from("campaign_schedules").select("is_active,event_id").eq("id", record.campaign_schedule_id).single() : { data: null };
  const { data: event } = schedule?.event_id ? await admin.from("events").select("status,ends_at").eq("id", schedule.event_id).single() : { data: null };
  if (!schedule?.is_active || event?.status === "cancelled" || event?.status === "completed" || event?.ends_at && new Date(event.ends_at).getTime() < Date.now()) {
    await admin.from("scheduled_posts").update({ status: "disabled", last_error_message: null }).eq("id", post.id);
    return { id: post.id, status: "disabled" };
  }
  await admin.from("scheduled_posts").update({ status: "processing", attempt_count: (record?.attempt_count ?? 0) + 1, last_error_message: null }).eq("id", post.id);
  try {
    let externalId = post.id;
    if (post.destination === "instagram") {
      if (!post.mediaUrl) throw new FatalError("Instagram post needs media");
      const containerId = record?.external_id ?? (await createInstagramContainer({ imageUrl: post.mediaUrl, caption: post.copy })).id;
      if (!record?.external_id) await admin.from("scheduled_posts").update({ external_id: containerId }).eq("id", post.id);
      externalId = (await publishInstagramContainer(containerId)).id;
    } else if (post.destination === "facebook") externalId = (await publishFacebookPost({ message: post.copy, link: post.eventUrl })).id;
    else if (post.destination === "google_business") externalId = (await publishGoogleBusinessEvent({ title: post.title, summary: post.copy, eventUrl: post.eventUrl, imageUrl: post.mediaUrl, startsAt: post.startsAt, endsAt: post.endsAt })).name;
    await admin.from("scheduled_posts").update({ status: "succeeded", external_id: externalId }).eq("id", post.id);
    return { id: post.id, status: "succeeded" };
  } catch (error) {
    await admin.from("scheduled_posts").update({ status: "failed", last_error_message: "Publishing needs attention" }).eq("id", post.id);
    throw error;
  }
}

export async function finishCampaignStep(scheduleId: string) {
  "use step";
  const admin = createSupabaseAdminClient();
  if (!admin) throw new FatalError("Supabase service role is not configured");
  await admin.from("campaign_schedules").update({ is_active: false }).eq("id", scheduleId);
  return { scheduleId, status: "completed" };
}
