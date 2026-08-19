import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { archiveMediaOriginal } from "@/lib/integrations/google-drive";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/quicktime"]);
const maxBytes = 100 * 1024 * 1024;

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Choose a file to upload." }, { status: 400 });
  if (!allowedTypes.has(file.type)) return Response.json({ error: "Choose a JPG, PNG, WEBP, GIF, MP4, or MOV file." }, { status: 415 });
  if (file.size > maxBytes) return Response.json({ error: "That file is larger than 100 MB." }, { status: 413 });

  const id = randomUUID();
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  const path = `uploads/${new Date().toISOString().slice(0, 10)}/${id}-${safeName}`;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return Response.json({ asset: { id, fileName: file.name, storagePath: path, publicUrl: "/event-placeholder.svg", archiveStatus: "simulated" }, mode: "preview" }, { status: 201 });

  const { error: uploadError } = await supabase.storage.from("oasis-media").upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return Response.json({ error: "The upload didn’t finish. Try again." }, { status: 500 });
  const { data: publicUrl } = supabase.storage.from("oasis-media").getPublicUrl(path);
  const { data: userData } = await supabase.auth.getUser();
  const { data: asset, error: recordError } = await supabase.from("media_assets").insert({
    id,
    uploaded_by: userData.user?.id,
    storage_path: path,
    public_url: publicUrl.publicUrl,
    file_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    tags: [String(formData.get("category") ?? "recent")],
  }).select("*").single();
  if (recordError) return Response.json({ error: "The file uploaded, but Oasis couldn’t finish organizing it." }, { status: 500 });
  const driveConfigured = Boolean(process.env.GOOGLE_DRIVE_ACCESS_TOKEN && process.env.GOOGLE_DRIVE_FOLDER_ID);
  if (driveConfigured) after(async () => {
    try {
      const driveFile = await archiveMediaOriginal({ name: file.name, contentType: file.type, bytes: await file.arrayBuffer() });
      await supabase.from("media_assets").update({ drive_file_id: driveFile.id }).eq("id", id);
    } catch {
      // The asset remains in Oasis and visibly needs archive attention; a later event publish can retry it.
    }
  });
  return Response.json({ asset, archiveStatus: driveConfigured ? "queued" : "not_connected", mode: "connected" }, { status: 201 });
}
