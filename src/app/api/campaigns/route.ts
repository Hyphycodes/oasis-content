import { randomUUID } from "node:crypto";
import { start } from "workflow/api";
import { z } from "zod";
import { getPublicAppUrl } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { campaignScheduleWorkflow } from "@/workflows/campaigns";
import type {
  CampaignWorkflowPayload,
  ScheduledCampaignPost,
} from "@/workflows/campaigns/types";

const variantSchema = z.object({
  instagram: z.string(),
  facebook: z.string(),
  google: z.string(),
  website: z.string(),
  story: z.string(),
  reminder: z.string(),
});
const inputSchema = z.object({
  title: z.string().min(2).max(120),
  eventId: z.string().min(1),
  masterCaption: z.string().min(5).max(1500),
  mediaUrl: z
    .string()
    .trim()
    .max(2048)
    .regex(/^(https?:\/\/|\/)/)
    .optional(),
  preset: z.string().max(80),
  variants: variantSchema,
  posts: z
    .array(
      z.object({
        channel: z.enum([
          "instagram",
          "facebook",
          "google_business",
          "website",
        ]),
        scheduledFor: z.iso.datetime(),
        copyKey: z.enum([
          "instagram",
          "facebook",
          "google",
          "website",
          "story",
          "reminder",
        ]),
        enabled: z.boolean(),
      }),
    )
    .min(1)
    .max(30),
});
const cancelSchema = z.object({
  scheduleId: z.string().min(3),
  action: z.literal("cancel"),
});

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success)
    return Response.json(
      { error: "Review the campaign timeline and try again." },
      { status: 400 },
    );
  const input = parsed.data;
  const enabledPosts = input.posts.filter((post) => post.enabled);
  const supabase = await createSupabaseServerClient();
  if (!supabase)
    return Response.json(
      {
        scheduleId: `preview-${randomUUID()}`,
        runId: "preview",
        posts: enabledPosts.length,
        status: "scheduled",
        mode: "preview",
      },
      { status: 202 },
    );

  const { data: event } = await supabase
    .from("events")
    .select(
      "id,slug,title,starts_at,ends_at,hero_image_url,primary_location_id",
    )
    .eq("id", input.eventId)
    .single();
  if (!event)
    return Response.json(
      { error: "Choose an event for this campaign." },
      { status: 404 },
    );
  const { data: userData } = await supabase.auth.getUser();
  const { data: content, error: contentError } = await supabase
    .from("content_items")
    .insert({
      event_id: event.id,
      location_id: event.primary_location_id,
      title: input.title,
      body: input.masterCaption,
      status: "scheduled",
      content_type: "social",
      created_by: userData.user?.id,
    })
    .select("id")
    .single();
  if (contentError || !content)
    return Response.json(
      { error: "The campaign couldn’t be saved." },
      { status: 500 },
    );
  await supabase
    .from("content_variants")
    .insert(
      Object.entries(input.variants).map(([destination, copy]) => ({
        content_item_id: content.id,
        destination,
        copy,
      })),
    );
  const { data: schedule, error: scheduleError } = await supabase
    .from("campaign_schedules")
    .insert({
      event_id: event.id,
      content_item_id: content.id,
      name: `${input.title} — ${input.preset}`,
      preset_key: input.preset.toLowerCase().replaceAll(" ", "_"),
      created_by: userData.user?.id,
    })
    .select("id")
    .single();
  if (scheduleError || !schedule)
    return Response.json(
      { error: "The campaign couldn’t be scheduled." },
      { status: 500 },
    );
  const { data: rows, error: rowsError } = await supabase
    .from("scheduled_posts")
    .insert(
      enabledPosts.map((post) => ({
        campaign_schedule_id: schedule.id,
        content_item_id: content.id,
        destination: post.channel,
        scheduled_for: post.scheduledFor,
        status: "pending",
      })),
    )
    .select("id,destination,scheduled_for");
  if (rowsError || !rows)
    return Response.json(
      { error: "The campaign timeline couldn’t be scheduled." },
      { status: 500 },
    );
  const origin = getPublicAppUrl(new URL(request.url).origin);
  const posts: ScheduledCampaignPost[] = rows.map((row, index) => {
    const source = enabledPosts[index];
    return {
      id: row.id,
      scheduledFor: row.scheduled_for,
      destination: row.destination as ScheduledCampaignPost["destination"],
      copy: input.variants[source.copyKey],
      mediaUrl: input.mediaUrl ?? event.hero_image_url ?? undefined,
      eventUrl: `${origin}/e/${event.slug}`,
      title: event.title,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
    };
  });
  const payload: CampaignWorkflowPayload = { scheduleId: schedule.id, posts };
  const run = await start(campaignScheduleWorkflow, [payload]);
  await supabase
    .from("scheduled_posts")
    .update({ workflow_run_id: run.runId })
    .in(
      "id",
      rows.map((row) => row.id),
    );
  await supabase
    .from("audit_log")
    .insert({
      actor_id: userData.user?.id,
      action: "campaign.scheduled",
      object_type: "campaign_schedule",
      object_id: schedule.id,
      changes: { preset: input.preset, postCount: posts.length },
    });
  return Response.json(
    {
      scheduleId: schedule.id,
      runId: run.runId,
      posts: posts.length,
      status: "scheduled",
      mode: "connected",
    },
    { status: 202 },
  );
}

export async function PATCH(request: Request) {
  const parsed = cancelSchema.safeParse(await request.json());
  if (!parsed.success)
    return Response.json(
      { error: "Choose a valid campaign schedule." },
      { status: 400 },
    );
  const supabase = await createSupabaseServerClient();
  if (!supabase)
    return Response.json({
      scheduleId: parsed.data.scheduleId,
      status: "cancelled",
      mode: "preview",
    });
  const { data: userData } = await supabase.auth.getUser();
  const { data: schedule, error } = await supabase
    .from("campaign_schedules")
    .update({ is_active: false })
    .eq("id", parsed.data.scheduleId)
    .select("id")
    .maybeSingle();
  if (error || !schedule)
    return Response.json(
      { error: "The campaign could not be cancelled." },
      { status: 404 },
    );
  await supabase
    .from("scheduled_posts")
    .update({ status: "disabled" })
    .eq("campaign_schedule_id", schedule.id)
    .in("status", ["pending", "queued"]);
  await supabase
    .from("audit_log")
    .insert({
      actor_id: userData.user?.id,
      action: "campaign.cancelled",
      object_type: "campaign_schedule",
      object_id: schedule.id,
    });
  return Response.json({
    scheduleId: schedule.id,
    status: "cancelled",
    mode: "connected",
  });
}
