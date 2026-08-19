import { FatalError } from "workflow";
import { archiveEventMetadata } from "@/lib/integrations/google-drive";
import { publishGoogleBusinessEvent } from "@/lib/integrations/google-business";
import { createInstagramContainer, publishFacebookPost, publishInstagramContainer } from "@/lib/integrations/meta";
import { IntegrationResponseError } from "@/lib/integrations/shared";
import { getPublicAppUrl } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PublishDestination, PublishEventPayload } from "@/workflows/publishing/types";

function friendlyFailure(destination: PublishDestination, error: unknown) {
  if (error instanceof IntegrationResponseError && (error.status === 401 || error.status === 403)) return `Reconnect ${destination === "google_business" ? "Google Business" : destination === "google_drive" ? "Google Drive" : destination === "instagram" ? "Instagram" : "Facebook"}`;
  return `Try ${destination.replaceAll("_", " ")} again`;
}

export async function publishDestinationStep(payload: PublishEventPayload, destination: PublishDestination) {
  "use step";
  const admin = createSupabaseAdminClient();
  if (!admin) throw new FatalError("Supabase service role is not configured");
  const { data: record } = await admin.from("publishing_destinations").select("id,status,external_id,attempt_count").eq("publishing_job_id", payload.jobId).eq("destination", destination).single();
  if (!record) throw new FatalError(`Missing destination record: ${destination}`);
  if (record.status === "succeeded") return { destination, status: "succeeded" as const, externalId: record.external_id };
  await admin.from("publishing_destinations").update({ status: "processing", attempt_count: record.attempt_count + 1, last_attempted_at: new Date().toISOString(), last_error_code: null, last_error_message: null }).eq("id", record.id);

  const origin = getPublicAppUrl();
  const eventUrl = `${origin}/e/${payload.event.slug}`;
  let result: { id: string; url?: string };
  try {
    if (destination === "website" || destination === "oasis_links") {
      await admin.from("events").update({ status: "published" }).eq("id", payload.event.id);
      result = { id: payload.event.id, url: destination === "website" ? eventUrl : `${origin}/go` };
    } else if (destination === "tickets") {
      await admin.from("events").update({ ticket_status: "on_sale" }).eq("id", payload.event.id);
      result = { id: payload.event.id, url: `${eventUrl}#tickets` };
    } else if (destination === "google_drive") {
      result = await archiveEventMetadata({ title: payload.event.title, startsAt: payload.event.startsAt, location: payload.event.locationName, eventUrl, captions: [payload.event.description], assetUrl: payload.event.imageUrl });
    } else if (destination === "instagram") {
      if (!payload.event.imageUrl) throw new FatalError("Instagram requires event media");
      const containerId = record.external_id ?? (await createInstagramContainer({ imageUrl: payload.event.imageUrl, caption: `${payload.event.title}\n\n${payload.event.description}\n\nTickets: ${eventUrl}` })).id;
      if (!record.external_id) await admin.from("publishing_destinations").update({ external_id: containerId }).eq("id", record.id);
      const published = await publishInstagramContainer(containerId);
      result = { id: published.id };
    } else if (destination === "facebook") {
      const published = await publishFacebookPost({ message: `${payload.event.title}\n\n${payload.event.description}`, link: eventUrl });
      result = { id: published.id };
    } else {
      const published = await publishGoogleBusinessEvent({ title: payload.event.title, summary: payload.event.description, eventUrl, imageUrl: payload.event.imageUrl, startsAt: payload.event.startsAt, endsAt: payload.event.endsAt });
      result = { id: published.name, url: published.searchUrl };
    }
    await admin.from("publishing_destinations").update({ status: "succeeded", external_id: result.id, external_url: result.url ?? null, succeeded_at: new Date().toISOString() }).eq("id", record.id);
    return { destination, status: "succeeded" as const, externalId: result.id };
  } catch (error) {
    const code = error instanceof IntegrationResponseError ? error.code : "publish_failed";
    const message = friendlyFailure(destination, error);
    await admin.from("publishing_destinations").update({ status: "failed", last_error_code: code, last_error_message: message }).eq("id", record.id);
    if (error instanceof IntegrationResponseError && [400, 401, 403, 404].includes(error.status)) throw new FatalError(message);
    throw error;
  }
}

export async function finishPublishingJobStep(jobId: string, results: { destination: PublishDestination; status: string }[]) {
  "use step";
  const admin = createSupabaseAdminClient();
  if (!admin) throw new FatalError("Supabase service role is not configured");
  const succeeded = results.every((result) => result.status === "succeeded");
  await admin.from("publishing_jobs").update({ status: succeeded ? "succeeded" : "failed", completed_at: new Date().toISOString() }).eq("id", jobId);
  return { jobId, status: succeeded ? "succeeded" : "needs_attention", results };
}
