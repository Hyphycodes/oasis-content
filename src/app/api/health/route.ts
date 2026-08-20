import { getEnvironmentReadiness, getWorkspaceMode } from "@/lib/env";

export function GET() {
  const readiness = getEnvironmentReadiness();
  const mode = getWorkspaceMode();
  const databaseConfigured = mode === "connected";
  return Response.json({
    ok:
      mode !== "configuration_required" &&
      (process.env.NODE_ENV !== "production" ||
        readiness.readyForCoreProduction),
    mode,
    productionReadiness: readiness,
    services: {
      database: databaseConfigured ? "configured" : "not_configured",
      stripe:
        process.env.STRIPE_SECRET_KEY &&
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
        process.env.STRIPE_WEBHOOK_SECRET
          ? "configured"
          : "not_configured",
      meta: readiness.integrations.meta.configured
        ? "configured"
        : "not_configured",
      googleBusiness: readiness.integrations.googleBusiness.configured
        ? "configured"
        : "not_configured",
      googleDrive: readiness.integrations.googleDrive.configured
        ? "configured"
        : "not_configured",
      resend:
        process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL
          ? "configured"
          : "not_configured",
      openai: readiness.integrations.openai.configured
        ? "configured"
        : "not_configured",
    },
  });
}
