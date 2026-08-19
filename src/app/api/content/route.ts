import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const variantsSchema = z.object({
  instagram: z.string().max(2200),
  facebook: z.string().max(5000),
  google: z.string().max(1500),
  website: z.string().max(5000),
  story: z.string().max(500),
  reminder: z.string().max(1500),
});

const inputSchema = z.object({
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(5).max(5000),
  eventId: z.string().min(1).optional(),
  mediaAssetId: z.string().uuid().optional(),
  contentType: z.enum(["social", "email", "website", "announcement"]),
  variants: variantsSchema,
});

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success)
    return Response.json(
      { error: "Add a title and a complete master caption." },
      { status: 400 },
    );
  const supabase = await createSupabaseServerClient();
  if (!supabase)
    return Response.json(
      {
        item: {
          id: `preview-${randomUUID()}`,
          title: parsed.data.title,
          status: "draft",
        },
        mode: "preview",
      },
      { status: 201 },
    );
  const { data: userData } = await supabase.auth.getUser();
  const { data: event } = parsed.data.eventId
    ? await supabase
        .from("events")
        .select("id,primary_location_id")
        .eq("id", parsed.data.eventId)
        .maybeSingle()
    : { data: null };
  if (parsed.data.eventId && !event)
    return Response.json(
      { error: "Choose an event that still exists." },
      { status: 404 },
    );
  const { data: item, error } = await supabase
    .from("content_items")
    .insert({
      event_id: event?.id ?? null,
      location_id: event?.primary_location_id ?? null,
      title: parsed.data.title,
      body: parsed.data.body,
      status: "draft",
      content_type: parsed.data.contentType,
      primary_media_asset_id: parsed.data.mediaAssetId ?? null,
      created_by: userData.user?.id,
    })
    .select("id,title,status")
    .single();
  if (error || !item)
    return Response.json(
      { error: "The content draft could not be saved." },
      { status: 500 },
    );
  const populatedVariants = Object.entries(parsed.data.variants).filter(
    ([, copy]) => copy.trim(),
  );
  if (populatedVariants.length) {
    const { error: variantsError } = await supabase
      .from("content_variants")
      .insert(
        populatedVariants.map(([destination, copy]) => ({
          content_item_id: item.id,
          destination,
          copy,
        })),
      );
    if (variantsError)
      return Response.json(
        { error: "The draft was saved, but its channel copy needs attention." },
        { status: 500 },
      );
  }
  await supabase.from("audit_log").insert({
    actor_id: userData.user?.id,
    action: "content.created",
    object_type: "content_item",
    object_id: item.id,
    changes: {
      eventId: event?.id ?? null,
      contentType: parsed.data.contentType,
      variantCount: populatedVariants.length,
    },
  });
  return Response.json({ item, mode: "connected" }, { status: 201 });
}
