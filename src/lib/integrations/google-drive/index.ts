import "server-only";
import { IntegrationResponseError, parseIntegrationResponse } from "@/lib/integrations/shared";

type DriveFile = { id: string; name: string; webViewLink?: string };

async function createFolder(name: string, parent: string, accessToken: string) {
  const response = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink", { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: [parent] }) });
  return parseIntegrationResponse<DriveFile>("Google Drive", response);
}

async function uploadMetadata(name: string, parent: string, contents: string, accessToken: string) {
  const boundary = `oasis_${crypto.randomUUID()}`;
  const metadata = JSON.stringify({ name, parents: [parent], mimeType: "text/plain" });
  const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${contents}\r\n--${boundary}--`;
  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink", { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": `multipart/related; boundary=${boundary}` }, body });
  return parseIntegrationResponse<DriveFile>("Google Drive", response);
}

async function uploadOriginal(sourceUrl: string, parent: string, accessToken: string) {
  const source = await fetch(sourceUrl);
  if (!source.ok) throw new IntegrationResponseError("Google Drive", source.status, "source_unavailable", "Original creative could not be downloaded");
  const contentType = source.headers.get("content-type") ?? "application/octet-stream";
  const extension = contentType.startsWith("image/") ? contentType.split("/")[1].replace("jpeg", "jpg") : contentType.startsWith("video/") ? contentType.split("/")[1] : "bin";
  const name = `Original Creative.${extension}`;
  const boundary = `oasis_${crypto.randomUUID()}`;
  const metadata = JSON.stringify({ name, parents: [parent] });
  const body = new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`, await source.arrayBuffer(), `\r\n--${boundary}--`]);
  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink", { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": `multipart/related; boundary=${boundary}` }, body });
  return parseIntegrationResponse<DriveFile>("Google Drive", response);
}

export async function archiveMediaOriginal(input: { name: string; contentType: string; bytes: ArrayBuffer }) {
  const accessToken = process.env.GOOGLE_DRIVE_ACCESS_TOKEN;
  const rootId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!accessToken || !rootId) throw new IntegrationResponseError("Google Drive", 401, "not_connected", "Google Drive is not connected");
  const boundary = `oasis_${crypto.randomUUID()}`;
  const metadata = JSON.stringify({ name: input.name, parents: [rootId] });
  const body = new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${input.contentType}\r\n\r\n`, input.bytes, `\r\n--${boundary}--`]);
  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink", { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": `multipart/related; boundary=${boundary}` }, body });
  return parseIntegrationResponse<DriveFile>("Google Drive", response);
}

export async function archiveEventMetadata(input: { title: string; startsAt: string; location: string; eventUrl: string; captions: string[]; assetUrl?: string }) {
  const accessToken = process.env.GOOGLE_DRIVE_ACCESS_TOKEN;
  const rootId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!accessToken || !rootId) throw new IntegrationResponseError("Google Drive", 401, "not_connected", "Google Drive is not connected");
  const date = new Date(input.startsAt);
  const eventFolder = await createFolder(`${input.title} - ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, rootId, accessToken);
  const contents = [`Event: ${input.title}`, `Date: ${date.toISOString()}`, `Location: ${input.location}`, `Public URL: ${input.eventUrl}`, "", "Captions", ...input.captions.map((caption, index) => `${index + 1}. ${caption}`)].join("\n");
  const metadata = await uploadMetadata("Event Details.txt", eventFolder.id, contents, accessToken);
  if (input.assetUrl) await uploadOriginal(input.assetUrl, eventFolder.id, accessToken);
  return { id: eventFolder.id, url: metadata.webViewLink ?? eventFolder.webViewLink };
}
