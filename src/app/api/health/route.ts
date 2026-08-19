import { hasSupabaseEnvironment } from "@/lib/supabase/server";
import { getEnvironmentReadiness } from "@/lib/env";

export function GET() {
  const readiness = getEnvironmentReadiness();
  return Response.json({
    ok: process.env.NODE_ENV !== "production" || readiness.readyForCoreProduction,
    mode: hasSupabaseEnvironment() ? "connected" : "preview",
    productionReadiness: readiness,
    services: {
      database: hasSupabaseEnvironment() ? "configured" : "not_configured",
      stripe: process.env.STRIPE_SECRET_KEY ? "configured" : "not_configured",
      meta: process.env.META_ACCESS_TOKEN ? "configured" : "not_configured",
      googleBusiness: process.env.GOOGLE_BUSINESS_ACCESS_TOKEN ? "configured" : "not_configured",
      googleDrive: process.env.GOOGLE_DRIVE_ACCESS_TOKEN ? "configured" : "not_configured",
      resend: process.env.RESEND_API_KEY ? "configured" : "not_configured",
      openai: process.env.OPENAI_API_KEY ? "configured" : "not_configured",
    },
  });
}
