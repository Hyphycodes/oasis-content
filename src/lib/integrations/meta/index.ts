import "server-only";
import { IntegrationResponseError, parseIntegrationResponse } from "@/lib/integrations/shared";

const graphVersion = process.env.META_GRAPH_VERSION ?? "v24.0";
const graphBase = `https://graph.facebook.com/${graphVersion}`;

function credentials() {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const instagramAccountId = process.env.META_INSTAGRAM_ACCOUNT_ID;
  const facebookPageId = process.env.META_FACEBOOK_PAGE_ID;
  if (!accessToken) throw new IntegrationResponseError("Meta", 401, "not_connected", "Meta is not connected");
  return { accessToken, instagramAccountId, facebookPageId };
}

export async function createInstagramContainer(input: { imageUrl: string; caption: string }) {
  const { accessToken, instagramAccountId } = credentials();
  if (!instagramAccountId) throw new IntegrationResponseError("Instagram", 400, "account_missing", "Instagram account is not mapped");
  const response = await fetch(`${graphBase}/${instagramAccountId}/media`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image_url: input.imageUrl, caption: input.caption, access_token: accessToken }) });
  return parseIntegrationResponse<{ id: string }>("Instagram", response);
}

export async function publishInstagramContainer(containerId: string) {
  const { accessToken, instagramAccountId } = credentials();
  if (!instagramAccountId) throw new IntegrationResponseError("Instagram", 400, "account_missing", "Instagram account is not mapped");
  const response = await fetch(`${graphBase}/${instagramAccountId}/media_publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creation_id: containerId, access_token: accessToken }) });
  return parseIntegrationResponse<{ id: string }>("Instagram", response);
}

export async function publishFacebookPost(input: { message: string; link: string }) {
  const { accessToken, facebookPageId } = credentials();
  if (!facebookPageId) throw new IntegrationResponseError("Facebook", 400, "page_missing", "Facebook Page is not mapped");
  const response = await fetch(`${graphBase}/${facebookPageId}/feed`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: input.message, link: input.link, access_token: accessToken }) });
  return parseIntegrationResponse<{ id: string }>("Facebook", response);
}
