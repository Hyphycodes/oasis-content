import "server-only";
import { IntegrationResponseError, parseIntegrationResponse } from "@/lib/integrations/shared";

export async function publishGoogleBusinessEvent(input: { title: string; summary: string; eventUrl: string; imageUrl?: string; startsAt: string; endsAt: string }) {
  const accessToken = process.env.GOOGLE_BUSINESS_ACCESS_TOKEN;
  const locationName = process.env.GOOGLE_BUSINESS_LOCATION_NAME;
  if (!accessToken || !locationName) throw new IntegrationResponseError("Google Business", 401, "not_connected", "Google Business is not connected");
  const start = new Date(input.startsAt);
  const end = new Date(input.endsAt);
  const time = (date: Date) => ({ hours: date.getHours(), minutes: date.getMinutes(), seconds: 0, nanos: 0 });
  const date = (value: Date) => ({ year: value.getFullYear(), month: value.getMonth() + 1, day: value.getDate() });
  const response = await fetch(`https://mybusiness.googleapis.com/v4/${locationName}/localPosts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      languageCode: "en-US",
      summary: input.summary,
      topicType: "EVENT",
      event: { title: input.title, schedule: { startDate: date(start), startTime: time(start), endDate: date(end), endTime: time(end) } },
      callToAction: { actionType: "LEARN_MORE", url: input.eventUrl },
      ...(input.imageUrl ? { media: [{ mediaFormat: "PHOTO", sourceUrl: input.imageUrl }] } : {}),
    }),
  });
  return parseIntegrationResponse<{ name: string; searchUrl?: string }>("Google Business", response);
}
