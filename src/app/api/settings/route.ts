import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const settingsInput = z.discriminatedUnion("section", [
  z.object({ section: z.literal("business"), name: z.string().min(2).max(120), phone: z.string().max(30), website: z.url().or(z.literal("")), timezone: z.string().max(80) }),
  z.object({ section: z.literal("location"), id: z.string().min(1), name: z.string().min(2).max(120), address: z.string().min(5).max(300), phone: z.string().max(30), timezone: z.string().max(80) }),
  z.object({ section: z.literal("publishing"), defaultDestinations: z.array(z.enum(["website", "tickets", "oasis_links", "google_drive", "instagram", "facebook", "google_business"])), lowInventoryThreshold: z.number().int().min(0).max(1000) }),
]);

export async function POST(request: Request) {
  const parsed = settingsInput.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Check these settings and try again." }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  if (!supabase) return Response.json({ saved: true, mode: "preview" });
  const { data: userData } = await supabase.auth.getUser();
  let error: { message: string } | null = null;
  if (parsed.data.section === "location") {
    const result = await supabase.from("locations").update({ name: parsed.data.name, address: parsed.data.address, phone: parsed.data.phone, timezone: parsed.data.timezone }).eq("id", parsed.data.id);
    error = result.error;
  } else {
    const result = await supabase.from("site_content").insert({ key: `settings:${parsed.data.section}:${crypto.randomUUID()}`, title: `Oasis ${parsed.data.section} settings`, body: JSON.stringify(parsed.data), is_published: false });
    error = result.error;
  }
  if (error) return Response.json({ error: "Settings couldn’t be saved." }, { status: 500 });
  await supabase.from("audit_log").insert({ actor_id: userData.user?.id, action: `settings.${parsed.data.section}.updated`, object_type: "settings", object_id: parsed.data.section, changes: parsed.data });
  return Response.json({ saved: true, mode: "connected" });
}
