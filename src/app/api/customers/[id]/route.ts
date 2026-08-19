import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const inputSchema = z
  .object({
    firstName: z.string().trim().max(100),
    lastName: z.string().trim().max(100),
    email: z.string().trim().email().max(254).optional().or(z.literal("")),
    phone: z.string().trim().max(40).optional(),
    emailConsent: z.boolean(),
    smsConsent: z.boolean(),
    notes: z.string().trim().max(1000),
  })
  .refine((value) => value.email || value.phone, {
    message: "Keep at least one email address or phone number.",
  });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success)
    return Response.json(
      {
        error: parsed.error.issues[0]?.message ?? "Check the customer details.",
      },
      { status: 400 },
    );
  const { id } = await params;
  const input = parsed.data;
  const supabase = await createSupabaseServerClient();
  if (!supabase)
    return Response.json({ customer: { id, ...input }, mode: "preview" });
  const { data: userData } = await supabase.auth.getUser();
  const { data: customer, error } = await supabase
    .from("customers")
    .update({
      first_name: input.firstName || null,
      last_name: input.lastName || null,
      email: input.email || null,
      phone: input.phone || null,
      marketing_email_consent: input.emailConsent,
      marketing_sms_consent: input.smsConsent,
      notes: input.notes || null,
    })
    .eq("id", id)
    .select("id")
    .single();
  if (error || !customer)
    return Response.json(
      { error: "The customer details could not be saved." },
      { status: 500 },
    );
  await supabase.from("audit_log").insert({
    actor_id: userData.user?.id,
    action: "customer.updated",
    object_type: "customer",
    object_id: id,
    changes: {
      emailConsent: input.emailConsent,
      smsConsent: input.smsConsent,
    },
  });
  return Response.json({ customer: { id, ...input }, mode: "connected" });
}
