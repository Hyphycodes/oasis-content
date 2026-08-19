import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const roleSchema = z.enum(["owner", "manager", "staff", "door"]);
const inputSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("invite"),
    name: z.string().trim().min(2).max(120),
    email: z.email(),
    role: roleSchema,
  }),
  z.object({
    action: z.literal("role"),
    userId: z.string().min(3),
    role: roleSchema,
  }),
]);

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success)
    return Response.json(
      { error: "Add a valid team member and role." },
      { status: 400 },
    );
  const admin = createSupabaseAdminClient();
  if (!admin) {
    if (process.env.NODE_ENV !== "production")
      return Response.json({
        member:
          parsed.data.action === "invite"
            ? {
                id: `preview-${Date.now()}`,
                name: parsed.data.name,
                email: parsed.data.email,
                role: parsed.data.role,
                status: "Invited",
              }
            : { id: parsed.data.userId, role: parsed.data.role },
        mode: "preview",
      });
    return Response.json(
      { error: "Team invitations require the Supabase service role." },
      { status: 503 },
    );
  }
  const serverClient = await createSupabaseServerClient();
  const { data: actorData } = serverClient
    ? await serverClient.auth.getUser()
    : { data: { user: null } };
  const { data: roleRow } = await admin
    .from("roles")
    .select("id")
    .eq("key", parsed.data.role)
    .single();
  if (!roleRow)
    return Response.json(
      { error: "That role is not available." },
      { status: 400 },
    );

  if (parsed.data.action === "invite") {
    const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(
      parsed.data.email,
      { data: { full_name: parsed.data.name } },
    );
    if (error || !invited.user)
      return Response.json(
        { error: error?.message ?? "The invitation could not be sent." },
        { status: 500 },
      );
    const { error: profileError } = await admin
      .from("profiles")
      .upsert({
        id: invited.user.id,
        full_name: parsed.data.name,
        is_active: true,
      });
    const { error: membershipError } = profileError
      ? { error: profileError }
      : await admin
          .from("user_roles")
          .upsert({ user_id: invited.user.id, role_id: roleRow.id });
    if (profileError || membershipError) {
      await admin.auth.admin.deleteUser(invited.user.id);
      return Response.json(
        { error: "The invitation could not be provisioned safely." },
        { status: 500 },
      );
    }
    await admin
      .from("audit_log")
      .insert({
        actor_id: actorData.user?.id,
        action: "team.invited",
        object_type: "profile",
        object_id: invited.user.id,
        changes: { email: parsed.data.email, role: parsed.data.role },
      });
    return Response.json(
      {
        member: {
          id: invited.user.id,
          name: parsed.data.name,
          email: parsed.data.email,
          role: parsed.data.role,
          status: "Invited",
        },
        mode: "connected",
      },
      { status: 201 },
    );
  }

  const { data: ownerRole } = await admin
    .from("roles")
    .select("id")
    .eq("key", "owner")
    .single();
  const { data: targetOwner } = ownerRole
    ? await admin
        .from("user_roles")
        .select("user_id")
        .eq("user_id", parsed.data.userId)
        .eq("role_id", ownerRole.id)
        .maybeSingle()
    : { data: null };
  if (targetOwner && parsed.data.role !== "owner") {
    const { count } = await admin
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role_id", ownerRole!.id);
    if ((count ?? 0) <= 1)
      return Response.json(
        { error: "Add another Owner before changing the last Owner’s role." },
        { status: 409 },
      );
  }
  const { data: priorMemberships } = await admin
    .from("user_roles")
    .select("user_id,role_id")
    .eq("user_id", parsed.data.userId);
  if (!priorMemberships?.length)
    return Response.json(
      { error: "That team member could not be found." },
      { status: 404 },
    );
  const { error: deleteError } = await admin
    .from("user_roles")
    .delete()
    .eq("user_id", parsed.data.userId);
  if (deleteError)
    return Response.json(
      { error: "The role could not be updated." },
      { status: 500 },
    );
  const { error } = await admin
    .from("user_roles")
    .insert({ user_id: parsed.data.userId, role_id: roleRow.id });
  if (error) {
    await admin.from("user_roles").insert(priorMemberships);
    return Response.json(
      { error: "The role could not be updated." },
      { status: 500 },
    );
  }
  await admin
    .from("audit_log")
    .insert({
      actor_id: actorData.user?.id,
      action: "team.role_updated",
      object_type: "profile",
      object_id: parsed.data.userId,
      changes: { role: parsed.data.role },
    });
  return Response.json({
    member: { id: parsed.data.userId, role: parsed.data.role },
    mode: "connected",
  });
}
