import { describe, expect, it } from "vitest";
import { can } from "@/lib/permissions";
import { zonedDateTimeToIso } from "@/lib/datetime";

describe("role permissions", () => {
  it("keeps the door role limited to check-in and roster access", () => {
    expect(can("door", "checkin:write")).toBe(true);
    expect(can("door", "roster:read")).toBe(true);
    expect(can("door", "events:write")).toBe(false);
    expect(can("door", "refunds:write")).toBe(false);
  });

  it("gives managers operational controls but reserves owner access", () => {
    expect(can("manager", "refunds:write")).toBe(true);
    expect(can("manager", "campaigns:write")).toBe(true);
    expect(can("manager", "integrations:write")).toBe(false);
    expect(can("owner", "integrations:write")).toBe(true);
  });
});

describe("event timezone conversion", () => {
  it("uses the correct Central offset across daylight-saving seasons", () => {
    expect(zonedDateTimeToIso("2026-01-17", "20:00")).toBe("2026-01-18T02:00:00.000Z");
    expect(zonedDateTimeToIso("2026-07-17", "20:00")).toBe("2026-07-18T01:00:00.000Z");
  });

  it("moves an after-midnight end time to the following local day", () => {
    expect(zonedDateTimeToIso("2026-07-17", "01:30", "America/Chicago", true)).toBe("2026-07-18T06:30:00.000Z");
  });
});
