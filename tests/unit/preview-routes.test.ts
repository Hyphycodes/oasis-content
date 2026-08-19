import { afterEach, describe, expect, it } from "vitest";
import { POST as checkIn } from "@/app/api/check-in/route";
import { POST as checkout } from "@/app/api/checkout/route";
import { POST as createContent } from "@/app/api/content/route";
import { PATCH as updateCustomer } from "@/app/api/customers/[id]/route";
import { POST as createEvent } from "@/app/api/events/route";
import { POST as createGuest } from "@/app/api/guests/route";
import { POST as createPromoter } from "@/app/api/promoters/route";
import { PATCH as updateEvent } from "@/app/api/events/[id]/route";
import { POST as joinWaitlist } from "@/app/api/waitlist/route";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

function jsonRequest(url: string, body: object) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("preview transaction routes", () => {
  it("creates a complete event draft without external credentials", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const response = await createEvent(
      jsonRequest("http://localhost/api/events", {
        title: "Noche de Prueba",
        locationId: "loc-downtown",
        date: "2026-09-12",
        startTime: "20:00",
        endTime: "00:30",
        template: "DJ Night",
        description: "A complete event creation acceptance test.",
        ageRestriction: "21+",
        ticketMode: "ticketed",
        price: 18,
        capacity: 220,
        ticketTypes: [
          { name: "General admission", price: 18, capacity: 180 },
          { name: "VIP table", price: 75, capacity: 40 },
        ],
        destinations: ["Website", "Tickets"],
        publish: true,
      }),
    );
    const data = await response.json();
    expect(response.status).toBe(201);
    expect(data.mode).toBe("preview");
    expect(data.event.slug).toContain("noche-de-prueba");
    expect(data.event.status).toBe("Live");
    expect(data.event.ticketTypes).toHaveLength(2);
  });

  it("duplicates and cancels an event as auditable lifecycle actions", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const context = { params: Promise.resolve({ id: "evt-selena" }) };
    const duplicateResponse = await updateEvent(
      jsonRequest("http://localhost/api/events/evt-selena", {
        action: "duplicate",
      }),
      context,
    );
    expect((await duplicateResponse.json()).event.status).toBe("Draft");
    const cancelResponse = await updateEvent(
      jsonRequest("http://localhost/api/events/evt-selena", {
        action: "cancel",
      }),
      context,
    );
    expect((await cancelResponse.json()).event.status).toBe("Needs Attention");
  });

  it("saves standalone channel content as an honest preview draft", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const response = await createContent(
      jsonRequest("http://localhost/api/content", {
        title: "Weekend announcement",
        body: "A fresh standalone announcement for the Oasis weekend crowd.",
        contentType: "announcement",
        variants: {
          instagram: "Weekend plans start here.",
          facebook: "Join Oasis this weekend.",
          google: "Weekend at Oasis.",
          website: "Make Oasis part of the weekend.",
          story: "This weekend at Oasis",
          reminder: "See you this weekend.",
        },
      }),
    );
    const data = await response.json();
    expect(response.status).toBe(201);
    expect(data.mode).toBe("preview");
    expect(data.item.status).toBe("draft");
  });

  it("keeps checkout, waitlist, and door outcomes usable in preview mode", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    const checkoutResponse = await checkout(
      jsonRequest("http://localhost/api/checkout", {
        slug: "selena-forever-dance-night",
        quantity: 2,
        name: "Marisol Vega",
        email: "marisol@example.com",
      }),
    );
    expect((await checkoutResponse.json()).redirectUrl).toContain("/tickets/");
    const waitlistResponse = await joinWaitlist(
      jsonRequest("http://localhost/api/waitlist", {
        slug: "selena-forever-dance-night",
        email: "wait@example.com",
        quantity: 2,
      }),
    );
    expect((await waitlistResponse.json()).status).toBe("waiting");
    const refundResult = await checkIn(
      jsonRequest("http://localhost/api/check-in", { code: "refund-123456" }),
    );
    expect((await refundResult.json()).result).toBe("refunded");
    const invalidResult = await checkIn(
      jsonRequest("http://localhost/api/check-in", { code: "invalid-123456" }),
    );
    expect((await invalidResult.json()).result).toBe("invalid");
  });

  it("creates expanded guest types and event-scoped promoter links", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const guestResponse = await createGuest(
      jsonRequest("http://localhost/api/guests", {
        eventId: "evt-selena",
        name: "Oasis Owner Guest",
        partySize: 3,
        type: "Owner Guest",
        email: "owner.guest@example.com",
      }),
    );
    const guestData = await guestResponse.json();
    expect(guestResponse.status).toBe(201);
    expect(guestData.guest.type).toBe("Owner Guest");

    const promoterResponse = await createPromoter(
      jsonRequest("http://localhost/api/promoters", {
        action: "create",
        name: "QA Promoter",
        socialHandle: "@qapromoter",
      }),
    );
    expect((await promoterResponse.json()).promoter.name).toBe("QA Promoter");
    const linkResponse = await createPromoter(
      jsonRequest("http://localhost/api/promoters", {
        action: "link",
        promoterId: "promoter-rico",
        eventId: "evt-selena",
      }),
    );
    const linkData = await linkResponse.json();
    expect(linkResponse.status).toBe(201);
    expect(linkData.link.destinationUrl).toMatch(
      /^\/e\/selena-forever-dance-night\?ref=preview-/,
    );
  });

  it("updates customer contact, consent, and manager notes in preview mode", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const response = await updateCustomer(
      jsonRequest("http://localhost/api/customers/cus-1", {
        firstName: "Marisol",
        lastName: "Vega",
        email: "marisol@example.com",
        phone: "(817) 555-0131",
        emailConsent: true,
        smsConsent: false,
        notes: "Prefers live music events.",
      }),
      { params: Promise.resolve({ id: "cus-1" }) },
    );
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.mode).toBe("preview");
    expect(data.customer.notes).toContain("live music");
  });
});
