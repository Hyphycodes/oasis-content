const coreProductionVariables = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
] as const;

const integrationGroups = {
  openai: ["OPENAI_API_KEY"],
  meta: ["META_ACCESS_TOKEN", "META_INSTAGRAM_ACCOUNT_ID", "META_FACEBOOK_PAGE_ID"],
  googleBusiness: ["GOOGLE_BUSINESS_ACCESS_TOKEN", "GOOGLE_BUSINESS_LOCATION_NAME"],
  googleDrive: ["GOOGLE_DRIVE_ACCESS_TOKEN", "GOOGLE_DRIVE_FOLDER_ID"],
} as const;

const localAppUrl = "http://localhost:3000";

export function getPublicAppUrl(fallback = localAppUrl) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configuredUrl) return fallback;

  try {
    const url = new URL(configuredUrl);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.origin
      : fallback;
  } catch {
    return fallback;
  }
}

export function getEnvironmentReadiness() {
  const missingCore = coreProductionVariables.filter((key) => !process.env[key]);
  const integrations = Object.fromEntries(Object.entries(integrationGroups).map(([name, variables]) => [name, { configured: variables.every((key) => Boolean(process.env[key])), missing: variables.filter((key) => !process.env[key]) }]));
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const validPublicUrl = Boolean(appUrl && /^https:\/\//.test(appUrl));
  return { readyForCoreProduction: missingCore.length === 0 && validPublicUrl, missingCore, validPublicUrl, integrations };
}
