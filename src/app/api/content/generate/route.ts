import { z } from "zod";
import { generateCampaignVariants } from "@/lib/integrations/openai";

const inputSchema = z.object({ title: z.string().trim().min(2).max(120), details: z.string().trim().min(5).max(1500), eventDate: z.string().max(80).optional(), location: z.string().max(120).optional(), tone: z.string().max(120).optional() });

function previewVariants(title: string, details: string) {
  return {
    instagram: `${title} is almost here. 🌵\n\n${details}\n\nBring your people and meet us at Oasis. Tickets are waiting at the link in bio.`,
    facebook: `Make plans for ${title} at Oasis. ${details} Save your spot, share it with your crew, and we’ll see you here.`,
    google: `${title} at Oasis. ${details} View event details and reserve your spot.`,
    website: `${details} Join us at Oasis for a night built around good music, good food, and good people.`,
    story: `${title}\nTickets on sale now\nTap for details →`,
    reminder: `Plans this week? ${title} is coming up at Oasis. Save your spot before the room fills.`,
  };
}

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Add a title and a little more direction first." }, { status: 400 });
  if (!process.env.OPENAI_API_KEY) return Response.json({ variants: previewVariants(parsed.data.title, parsed.data.details), mode: "preview" });
  try {
    const variants = await generateCampaignVariants(parsed.data);
    return Response.json({ variants, mode: "openai" });
  } catch {
    return Response.json({ error: "Campaign copy couldn’t be generated right now. Your draft is still safe." }, { status: 502 });
  }
}
