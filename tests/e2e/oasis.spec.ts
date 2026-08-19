import { expect, test } from "@playwright/test";

test("a staff member can create and publish an event from a flyer", async ({
  page,
}) => {
  await page.goto("/admin/events/new");
  await expect(
    page.getByRole("heading", { name: "Add your flyer or video" }),
  ).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({
    name: "noche.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(page.getByText("noche.png is ready")).toBeVisible();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByLabel("Event name").fill("Noche de Cumbia QA");
  await page
    .getByLabel("Short description")
    .fill("A joyful cumbia night built through the complete Oasis event flow.");
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(
    page.getByRole("heading", { name: "How should guests join?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Add another ticket type/ }).click();
  await page.getByLabel("Ticket name").nth(1).fill("VIP table");
  await page.getByLabel("Price").nth(1).fill("75");
  await page.getByLabel("Capacity").nth(1).fill("20");
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(
    page.getByRole("heading", { name: "Ready to share it?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Publish event/ }).click();
  await expect(page).toHaveURL(/\/admin\/events\/preview-/);
  await expect(page.getByText("Your event is on its way.")).toBeVisible();
});

test("a guest can complete preview checkout and open the ticket wallet", async ({
  page,
}) => {
  await page.goto("/checkout/selena-forever-dance-night?quantity=2");
  await page.getByLabel("Full name").fill("Marisol Vega");
  await page.getByLabel("Email").fill("marisol@example.com");
  await page
    .getByRole("button", { name: /Continue to secure payment/ })
    .click();
  await expect(page).toHaveURL(/\/tickets\/oasis-demo-order-7K4P9M/);
  await expect(
    page.getByRole("heading", { name: "Selena Forever" }).first(),
  ).toBeVisible();
  await expect(page.getByText("Ready to scan")).toHaveCount(2);
});

test("door mode distinguishes a valid ticket from a duplicate", async ({
  page,
}) => {
  await page.goto("/check-in");
  await page.getByRole("button", { name: /Scan demo ticket/ }).click();
  await expect(page.getByRole("heading", { name: "VALID" })).toBeVisible();
  await page.getByRole("button", { name: /Scan next ticket/ }).click();
  await page.getByRole("button", { name: /Scan demo ticket/ }).click();
  await expect(
    page.getByRole("heading", { name: "ALREADY CHECKED IN" }),
  ).toBeVisible();
});

test("a manager can add a comp without leaving the guest list", async ({
  page,
}) => {
  await page.goto("/admin/guests");
  await page.getByRole("button", { name: "Add guest" }).first().click();
  const form = page.locator(".quick-guest-modal");
  await form.getByLabel("Name").fill("QA Guest");
  await form.getByLabel("Guests").fill("2");
  await form.getByLabel("Type").selectOption("Comp");
  await form.getByLabel(/Note/).fill("Acceptance test comp");
  await form.getByRole("button", { name: "Add to guest list" }).click();
  await expect(page.getByText(/QA Guest \+1 added/)).toBeVisible();
  await expect(page.getByText("QA Guest +1", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Add promoter" }).click();
  const promoterForm = page.locator(".quick-guest-modal");
  await promoterForm.getByLabel("Name").fill("QA Promoter");
  await promoterForm.getByLabel(/Social handle/).fill("@qapromoter");
  await promoterForm.getByRole("button", { name: "Add promoter" }).click();
  await expect(page.getByText(/QA Promoter is ready/)).toBeVisible();
  await expect(page.getByText("QA Promoter", { exact: true })).toBeVisible();
});

test("published website content has a public preview and a safe draft action", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Good food. Good music. Good people." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Explore the menu/ }),
  ).toBeVisible();

  await page.goto("/admin/menu");
  await page.getByRole("button", { name: "Website content" }).click();
  await page.getByLabel("Hero title").fill("Good food. Great nights. Oasis.");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(
    page.getByText(/Website draft saved in preview mode/),
  ).toBeVisible();
});

test("a manager can search a source-backed customer profile and edit its notes", async ({
  page,
}) => {
  await page.goto("/admin/customers");
  await page.getByLabel("Search customers").fill("Marisol");
  await page.getByRole("link", { name: /Marisol Vega/ }).click();
  await expect(
    page.getByRole("heading", { name: "Marisol Vega" }),
  ).toBeVisible();
  await expect(page.getByText("Purchased tickets")).toBeVisible();
  await page.getByRole("button", { name: "Edit details" }).click();
  await page
    .getByLabel(/Internal notes/)
    .fill("Prefers live music events and aisle seating.");
  await page.getByRole("button", { name: "Save customer" }).click();
  await expect(page.getByText(/Customer saved in preview mode/)).toBeVisible();
});

test("public discovery and the admin today view remain clear on mobile", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "mobile acceptance only");
  await page.goto("/events");
  await expect(
    page.getByRole("heading", { name: /Come for dinner/ }),
  ).toBeVisible();
  await expect(page.locator(".public-event").first()).toBeVisible();
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: /Good/ })).toBeVisible();
  await expect(page.locator(".mobile-nav")).toBeVisible();
});
