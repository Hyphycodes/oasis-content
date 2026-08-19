import "server-only";
import OpenAI from "openai";
import { IntegrationResponseError } from "@/lib/integrations/shared";

export type CampaignVariants = {
  instagram: string;
  facebook: string;
  google: string;
  website: string;
  story: string;
  reminder: string;
};

export async function generateCampaignVariants(input: { title: string; details: string; eventDate?: string; location?: string; tone?: string }): Promise<CampaignVariants> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new IntegrationResponseError("OpenAI", 401, "not_connected", "OpenAI is not connected");
  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
    store: false,
    input: [
      { role: "developer", content: "You write warm, specific, concise event marketing for Oasis Mexican Kitchen & Bar. Avoid generic hype, fake urgency, and unsupported claims. Keep each channel distinct. Staff will review and edit every result before publishing." },
      { role: "user", content: `Create a campaign for: ${input.title}\nDetails: ${input.details}\nDate: ${input.eventDate ?? "not provided"}\nLocation: ${input.location ?? "Oasis"}\nTone: ${input.tone ?? "warm, lively, welcoming"}` },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "oasis_campaign_variants",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            instagram: { type: "string" },
            facebook: { type: "string" },
            google: { type: "string" },
            website: { type: "string" },
            story: { type: "string" },
            reminder: { type: "string" },
          },
          required: ["instagram", "facebook", "google", "website", "story", "reminder"],
        },
      },
    },
  });
  if (!response.output_text) throw new IntegrationResponseError("OpenAI", 502, "empty_response", "Campaign generation returned no copy");
  return JSON.parse(response.output_text) as CampaignVariants;
}
