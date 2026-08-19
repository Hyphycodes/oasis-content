import type { Role } from "@/lib/types";

export const permissions = {
  door: ["checkin:write", "roster:read"],
  staff: ["events:write", "content:write", "publishing:write", "sales:read"],
  manager: ["events:write", "content:write", "publishing:write", "sales:read", "guests:write", "refunds:write", "analytics:read", "menu:write", "campaigns:write"],
  owner: ["*"],
} satisfies Record<Role, string[]>;

export function can(role: Role, permission: string) {
  return permissions[role].includes("*") || permissions[role].includes(permission);
}
