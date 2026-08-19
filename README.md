# Oasis Admin

Oasis Admin is the first-party operating system for Oasis events: creation, owned ticketing, guest lists, door check-in, publishing, campaign content, media archiving, CRM, attribution, analytics, menus, and public event discovery.

The interface is intentionally work-first. Event and door staff see the next action; technical connection details stay in Owner / Admin settings.

## What is included

- Next.js App Router application with responsive public, admin, checkout, ticket-wallet, and door experiences
- Supabase PostgreSQL schema, RLS policies, storage bucket, transactional inventory functions, and development seed
- Stripe Embedded Checkout, idempotent webhook fulfillment, full/partial refunds, capacity return, and ticket invalidation
- Resend ticket confirmations with a secure first-party ticket-wallet link
- Durable publish-everywhere and scheduled-campaign workflows
- Meta, Google Business Profile, Google Drive, OpenAI, Stripe, and Resend server adapters
- First-party event pages, Oasis Links, promoter attribution, CRM history, event economics, menus, and site content
- Clearly labeled preview mode when local credentials are absent
- Vitest route/permission tests and Playwright desktop/mobile acceptance tests

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- A Supabase project for connected data
- A Stripe account for paid tickets
- A Resend account and verified sender for confirmation email
- Vercel for the intended production host and Workflow runtime
- Optional provider accounts for OpenAI, Meta, Google Business Profile, and Google Drive

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. With no Supabase or provider credentials, Oasis runs as a visibly labeled preview workspace. Preview responses never claim that an external publish or payment happened in production.

Run the complete local verification suite with:

```bash
npm run check
npm run test:e2e
```

## Supabase setup

1. Create a Supabase project.
2. Install and authenticate the Supabase CLI.
3. Link this checkout: `supabase link --project-ref <project-ref>`.
4. Apply [the foundation migration](./supabase/migrations/202608180001_oasis_foundation.sql): `supabase db push`.
5. For local development only, run `supabase db reset` to apply [the safe development seed](./supabase/seed.sql).
6. Copy the project URL, anon key, and service-role key into `.env.local`.
7. Create the first Auth user, then insert a matching `profiles` row and assign the `owner` role in `user_roles`.

The migration enables RLS on operational tables. Browser and staff requests use the signed-in user; checkout fulfillment, secure ticket wallets, waitlists, and provider callbacks use the server-only service role. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

The seed contains a clearly synthetic Lockport location, Paint & Sip and DJ Night examples, ticket types, content, a customer, and a promoter. It is for local development only and must not be run against production.

## Stripe setup

1. Add `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
2. Choose whether Oasis absorbs fees or adds them to checkout with `OASIS_FEE_MODE` and `OASIS_SERVICE_FEE_PERCENT`.
3. In Stripe Workbench, add the production endpoint `https://YOUR_DOMAIN/api/webhooks/stripe`.
4. Subscribe to `checkout.session.completed`, `checkout.session.expired`, and `charge.refunded`.
5. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`.
6. During local development, forward events with `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

The webhook records each Stripe event before processing it. Re-delivery is idempotent. Ticket inventory is reserved before Checkout, fulfilled once after payment, and released when a session expires.

## Resend setup

1. Verify the production sending domain in Resend.
2. Create an API key and set `RESEND_API_KEY`.
3. Set `RESEND_FROM_EMAIL` to a verified sender such as `Oasis Tickets <tickets@your-domain.com>`.
4. Complete a Stripe test purchase and confirm the wallet link in the delivered message uses the production domain.

## OpenAI setup

Set `OPENAI_API_KEY`. `OPENAI_MODEL` is optional and defaults to `gpt-5.6-luna`. Generated campaign variants use the Responses API with a strict JSON schema, and they always remain editable before scheduling.

## Meta setup

The current adapter expects a server-side access token plus the Instagram Business account and Facebook Page IDs. The connected Instagram account must be a professional account linked to the Facebook Page and the app must have the permissions required for content publishing.

For production OAuth, configure `META_APP_ID`, `META_APP_SECRET`, and `META_WEBHOOK_VERIFY_TOKEN`; register the HTTPS callback for your final domain; request only the publishing and Page/Instagram permissions the app uses; and persist refreshed connected-account tokens in encrypted server-side integration storage. Never place Meta secrets in `NEXT_PUBLIC_*` variables.

Provider review and live-mode approval are external release gates. Until the account is connected, the UI reports **Needs Attention** and each failed destination remains independently retryable.

## Google setup

1. Create or select a Google Cloud project.
2. Enable the Google Drive API and Business Profile APIs required for local posts.
3. Configure the OAuth consent screen.
4. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` for the final HTTPS callback.
5. Request only Drive file access and Business Profile management scopes.
6. Ensure the authenticating Google user manages the target Business Profile location and Drive folder.
7. Until OAuth is wired for the account, provide the server-side access tokens and IDs in `.env.local` or the production environment.

`GOOGLE_BUSINESS_LOCATION_NAME` uses the provider resource form expected by the adapter. `GOOGLE_DRIVE_FOLDER_ID` is the parent archive folder. Publishing creates an event folder and saves event metadata, captions, and the original creative there automatically.

## Environment variables

Copy [.env.example](./.env.example). Core production readiness requires:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

Publishing integrations are independently optional but required for their destinations. Owner / Admin can inspect redacted readiness at `/api/health`; secret values are never returned.

## Vercel deployment

1. Import this GitHub repository into Vercel.
2. Set every core production variable for Production and the appropriate Preview values.
3. Set provider variables only for connected destinations.
4. Use the final HTTPS origin for `NEXT_PUBLIC_APP_URL`, Stripe webhook, Google redirect, and Meta redirect URLs.
5. Apply the Supabase migration before accepting traffic. Do not apply the development seed.
6. Deploy and check `/api/health` as an Owner.
7. Run a real test-mode purchase, webhook fulfillment, confirmation email, ticket-wallet open, door scan, duplicate scan, and refund.
8. Verify each publishing destination independently and retry one intentional failure.
9. Promote only after the role walkthroughs below pass.

Supabase SSR owns secure session cookies and the route proxy refreshes them. All provider keys remain in server-only environment variables. Durable workflows are compiled through `withWorkflow` in [next.config.ts](./next.config.ts).

## Required production walkthrough

- Event Staff: upload a flyer, create a draft, set tickets, preview, publish, edit, and upload a recap.
- Customer: open the public event, purchase, receive email, and open every QR ticket.
- Door: scan a valid, duplicate, refunded, and invalid ticket; search a guest; partially check in a party.
- Manager: add a comp and complete both partial and full refund tests.
- Owner: inspect analytics, team access, integration health, and destination retry behavior.

## External release gates and current limitations

- Live Stripe, Resend, Meta, Google Business, and Google Drive behavior requires the corresponding credentials and provider approval.
- Meta and Google OAuth account-connection screens are represented by Owner settings and server-side integration storage; the checked-in adapters currently accept server-provided access tokens. Completing provider OAuth refresh/token rotation is the recommended next release-hardening iteration.
- Automated tests exercise deterministic preview flows. Repeat the production walkthrough against provider sandbox/test accounts before taking real sales.
- The seed uses synthetic contact/location data and is deliberately excluded from production provisioning.
