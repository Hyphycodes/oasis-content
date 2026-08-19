import { randomUUID } from "node:crypto";
import { start } from "workflow/api";
import { z } from "zod";
import { events } from "@/lib/demo-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publishEventWorkflow } from "@/workflows/publishing";
import type {
  PublishDestination,
  PublishEventPayload,
} from "@/workflows/publishing/types";

const destinations = [
  "website",
  "tickets",
  "oasis_links",
  "google_drive",
  "instagram",
  "facebook",
  "google_business",
] as const;
const inputSchema = z.object({
  eventId: z.string().min(1),
  destinations: z.array(z.enum(destinations)).min(1).max(destinations.length),
});

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success)
    return Response.json(
      { error: "Choose at least one publishing destination." },
      { status: 400 },
    );
  const supabase = await createSupabaseServerClient();
  if (!supabase)
    return Response.json(
      {
        jobId: `preview-${randomUUID()}`,
        runId: "preview",
        status: "queued",
        destinations: parsed.data.destinations,
        mode: "preview",
      },
      { status: 202 },
    );

  const { data: event, error } = await supabase
    .from("events")
    .select(
      "id,slug,title,description,starts_at,ends_at,hero_image_url,locations!events_primary_location_id_fkey(name)",
    )
    .eq("id", parsed.data.eventId)
    .single();
  if (error || !event)
    return Response.json(
      { error: "The event couldn’t be found." },
      { status: 404 },
    );
  const { data: userData } = await supabase.auth.getUser();
  const idempotencyKey = `publish:${event.id}:${randomUUID()}`;
  const { data: job, error: jobError } = await supabase
    .from("publishing_jobs")
    .insert({
      event_id: event.id,
      requested_by: userData.user?.id,
      status: "queued",
      idempotency_key: idempotencyKey,
    })
    .select("id")
    .single();
  if (jobError || !job)
    return Response.json(
      { error: "Publishing couldn’t be queued. Try again." },
      { status: 500 },
    );
  const destinationRows = parsed.data.destinations.map((destination) => ({
    publishing_job_id: job.id,
    destination,
    status: "queued",
    idempotency_key: `${idempotencyKey}:${destination}`,
  }));
  const { error: destinationsError } = await supabase
    .from("publishing_destinations")
    .insert(destinationRows);
  if (destinationsError) {
    await supabase
      .from("publishing_jobs")
      .update({ status: "failed", completed_at: new Date().toISOString() })
      .eq("id", job.id);
    return Response.json(
      { error: "Publishing couldn’t be queued. Try again." },
      { status: 500 },
    );
  }
  const location = Array.isArray(event.locations)
    ? event.locations[0]
    : event.locations;
  const payload: PublishEventPayload = {
    jobId: job.id,
    event: {
      id: event.id,
      slug: event.slug,
      title: event.title,
      description: event.description ?? "",
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      locationName: location?.name ?? "Oasis",
      imageUrl: event.hero_image_url ?? undefined,
    },
    destinations: parsed.data.destinations as PublishDestination[],
  };
  let run: Awaited<ReturnType<typeof start>>;
  try {
    run = await start(publishEventWorkflow, [payload]);
  } catch {
    await supabase
      .from("publishing_jobs")
      .update({ status: "failed", completed_at: new Date().toISOString() })
      .eq("id", job.id);
    await supabase
      .from("publishing_destinations")
      .update({
        status: "failed",
        last_error_code: "workflow_start_failed",
        last_error_message: "Try publishing again",
      })
      .eq("publishing_job_id", job.id);
    return Response.json(
      { error: "Publishing couldn’t start. The event is still saved." },
      { status: 503 },
    );
  }
  await supabase
    .from("publishing_jobs")
    .update({ workflow_run_id: run.runId })
    .eq("id", job.id);
  await supabase
    .from("audit_log")
    .insert({
      actor_id: userData.user?.id,
      action: "event.publish_queued",
      object_type: "event",
      object_id: event.id,
      changes: { destinations: parsed.data.destinations, jobId: job.id },
    });
  return Response.json(
    {
      jobId: job.id,
      runId: run.runId,
      status: "queued",
      destinations: parsed.data.destinations,
      mode: "connected",
    },
    { status: 202 },
  );
}

export function GET() {
  return Response.json({
    previewEvents: events.map(({ id, title }) => ({ id, title })),
  });
}
