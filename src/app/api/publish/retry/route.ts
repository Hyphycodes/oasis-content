import { z } from "zod";

const inputSchema = z.object({ eventId: z.string().min(1), destination: z.enum(["website", "tickets", "oasis_links", "google_drive", "instagram", "facebook", "google_business"]) });

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "That destination can’t be retried." }, { status: 400 });
  return fetch(new URL("/api/publish", request.url), { method: "POST", headers: { "Content-Type": "application/json", Cookie: request.headers.get("cookie") ?? "" }, body: JSON.stringify({ eventId: parsed.data.eventId, destinations: [parsed.data.destination] }) });
}
