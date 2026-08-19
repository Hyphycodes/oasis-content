import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const inputSchema = z.object({ code: z.string().min(6).max(200), deviceLabel: z.string().max(100).optional() });

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ result: "invalid" }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    const code = parsed.data.code.toLowerCase();
    if (code.includes("refund")) return Response.json({ result: "refunded" });
    if (code.includes("invalid")) return Response.json({ result: "invalid" });
    return Response.json({ result: "valid", name: "Marisol Vega", ticketType: "General admission", checkedInAt: new Date().toISOString(), mode: "preview" });
  }
  const { data, error } = await supabase.rpc("check_in_ticket", { p_code: parsed.data.code, p_device_label: parsed.data.deviceLabel ?? "Oasis Door PWA" });
  if (error) return Response.json({ error: "The ticket couldn’t be checked in. Try again." }, { status: 500 });
  return Response.json(data);
}
