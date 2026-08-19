import { afterEach, describe, expect, it } from "vitest";
import { getPublicAppUrl } from "@/lib/env";

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

afterEach(() => {
  if (originalAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
});

describe("public app URL", () => {
  it.each(["", "   ", "not a URL", "javascript:alert(1)"])(
    "uses the fallback when NEXT_PUBLIC_APP_URL is %j",
    (configuredUrl) => {
      process.env.NEXT_PUBLIC_APP_URL = configuredUrl;
      expect(getPublicAppUrl("https://request.example")).toBe(
        "https://request.example",
      );
    },
  );

  it("normalizes a valid public URL to its origin", () => {
    process.env.NEXT_PUBLIC_APP_URL = " https://oasis.example/admin/ ";
    expect(getPublicAppUrl()).toBe("https://oasis.example");
  });
});
