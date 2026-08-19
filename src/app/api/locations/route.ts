import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const locationSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().min(5).max(300),
  phone: z.string().trim().max(30),
  timezone: z.string().trim().min(3).max(80),
  hours: z.string().trim().min(3).max(200),
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 70);
}

export async function POST(request: Request) {
  const parsed = locationSchema.safeParse(await request.json());
  if (!parsed.success)
    return Response.json(
      { error: "Add a name, address, and timezone." },
      { status: 400 },
    );
  const input = parsed.data;
  const supabase = await createSupabaseServerClient();
  if (!supabase)
    return Response.json(
      {
        location: {
          ...input,
          id: input.id ?? crypto.randomUUID(),
          hours: input.hours,
        },
        mode: "preview",
      },
      { status: input.id ? 200 : 201 },
    );
  const { data: userData } = await supabase.auth.getUser();
  const payload = {
    name: input.name,
    address: input.address,
    phone: input.phone || null,
    timezone: input.timezone,
    operating_hours: input.hours,
    slug: slugify(input.name),
    is_active: true,
  };
  const result = input.id
    ? await supabase
        .from("locations")
        .update(payload)
        .eq("id", input.id)
        .select("*")
        .single()
    : await supabase.from("locations").insert(payload).select("*").single();
  if (result.error || !result.data)
    return Response.json(
      {
        error:
          "The location could not be saved. Check that its name is unique.",
      },
      { status: 500 },
    );
  await supabase.from("audit_log").insert({
    actor_id: userData.user?.id,
    action: input.id ? "location.updated" : "location.created",
    object_type: "location",
    object_id: result.data.id,
    changes: { name: input.name, timezone: input.timezone },
  });
  return Response.json(
    {
      location: {
        id: result.data.id,
        name: result.data.name,
        address: result.data.address,
        phone: result.data.phone ?? "",
        timezone: result.data.timezone,
        hours:
          typeof result.data.operating_hours === "string"
            ? result.data.operating_hours
            : input.hours,
      },
      mode: "connected",
    },
    { status: input.id ? 200 : 201 },
  );
}
