import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const trackInput = z.object({
  eventName: z.enum([
    "page_view",
    "link_click",
    "event_view",
    "checkout_start",
  ]),
  visitorId: z.string().max(100).optional(),
  oasisEventId: z.string().max(100).optional(),
  source: z.string().max(100).optional(),
  path: z.string().max(500).optional(),
  referrer: z.string().max(500).optional(),
  properties: z
    .record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.null()]),
    )
    .optional(),
});

export async function POST(request: Request) {
  const parsed = trackInput.safeParse(await request.json());
  if (!parsed.success)
    return Response.json({ accepted: false }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const uuidEventId =
    parsed.data.oasisEventId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      parsed.data.oasisEventId,
    )
      ? parsed.data.oasisEventId
      : null;
  if (supabase)
    await supabase
      .from("analytics_events")
      .insert({
        event_name: parsed.data.eventName,
        visitor_id: parsed.data.visitorId,
        oasis_event_id: uuidEventId,
        source: parsed.data.source,
        path: parsed.data.path,
        referrer: parsed.data.referrer,
        properties: {
          ...(parsed.data.properties ?? {}),
          ...(uuidEventId ? {} : { event_key: parsed.data.oasisEventId }),
        },
      });
  const promoterCode = parsed.data.properties?.promoter_code;
  if (
    parsed.data.eventName === "event_view" &&
    typeof promoterCode === "string" &&
    promoterCode
  ) {
    const admin = createSupabaseAdminClient();
    if (admin)
      await admin.rpc("record_promoter_click", { p_code: promoterCode });
  }
  return Response.json({ accepted: true }, { status: 202 });
}
