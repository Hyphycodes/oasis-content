import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  hero: z.string().trim().min(2).max(160),
  subtitle: z.string().trim().min(2).max(400),
  heroImage: z
    .string()
    .trim()
    .max(2048)
    .regex(/^(https?:\/\/|\/)/, "Choose a valid image URL."),
  primaryCta: z.string().trim().min(2).max(60),
  secondaryCta: z.string().trim().min(2).max(60),
  eventsHeading: z.string().trim().min(2).max(160),
  banner: z.string().trim().max(200),
  privateEvents: z.string().trim().max(1000),
  phone: z.string().trim().min(3).max(30),
  address: z.string().trim().min(3).max(300),
  hours: z.string().trim().min(3).max(200),
  reservationUrl: z
    .string()
    .trim()
    .max(500)
    .refine(
      (value) => !value || /^(https?:\/\/|tel:)/.test(value),
      "Use an HTTPS or telephone reservation link.",
    ),
  publish: z.boolean(),
});

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success)
    return Response.json(
      { error: "Review the website copy and try again." },
      { status: 400 },
    );
  const supabase = await createSupabaseServerClient();
  if (!supabase)
    return Response.json({
      saved: true,
      published: parsed.data.publish,
      mode: "preview",
    });
  const { data: userData } = await supabase.auth.getUser();
  const values = [
    {
      key: "homepage_hero",
      title: parsed.data.hero,
      body: parsed.data.subtitle,
      metadata: {
        heroImage: parsed.data.heroImage,
        primaryCta: parsed.data.primaryCta,
        secondaryCta: parsed.data.secondaryCta,
      },
    },
    {
      key: "homepage_events",
      title: parsed.data.eventsHeading,
      body: "",
    },
    { key: "promotional_banner", title: parsed.data.banner, body: "" },
    {
      key: "private_events",
      title: "Private events",
      body: parsed.data.privateEvents,
    },
    {
      key: "visitor_details",
      title: parsed.data.phone,
      body: parsed.data.address,
      metadata: {
        hours: parsed.data.hours,
        reservationUrl: parsed.data.reservationUrl,
      },
    },
  ];
  for (const value of values) {
    const targetValue = {
      ...value,
      key: parsed.data.publish ? value.key : `draft:${value.key}`,
    };
    const { data: existing } = await supabase
      .from("site_content")
      .select("id")
      .eq("key", targetValue.key)
      .is("location_id", null)
      .maybeSingle();
    const result = existing
      ? await supabase
          .from("site_content")
          .update({ ...targetValue, is_published: parsed.data.publish })
          .eq("id", existing.id)
      : await supabase
          .from("site_content")
          .insert({ ...targetValue, is_published: parsed.data.publish });
    if (result.error)
      return Response.json(
        { error: "Website content could not be saved." },
        { status: 500 },
      );
  }
  if (parsed.data.publish) {
    const { error: draftCleanupError } = await supabase
      .from("site_content")
      .delete()
      .in(
        "key",
        values.map((value) => `draft:${value.key}`),
      )
      .is("location_id", null);
    if (draftCleanupError)
      return Response.json(
        {
          error:
            "The changes are live, but the old draft could not be cleared. Refresh before editing again.",
        },
        { status: 500 },
      );
  }
  await supabase.from("audit_log").insert({
    actor_id: userData.user?.id,
    action: parsed.data.publish
      ? "site_content.published"
      : "site_content.saved",
    object_type: "site_content",
    object_id: "global",
    changes: { keys: values.map((value) => value.key) },
  });
  return Response.json({
    saved: true,
    published: parsed.data.publish,
    mode: "connected",
  });
}
