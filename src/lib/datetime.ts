export function zonedDateTimeToIso(date: string, time: string, timeZone = "America/Chicago", endAfterMidnight = false) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const desired = new Date(Date.UTC(year, month - 1, day + (endAfterMidnight && hour < 6 ? 1 : 0), hour, minute));
  let instant = desired.getTime();
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
    const represented = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
    const correction = desired.getTime() - represented;
    instant += correction;
    if (correction === 0) break;
  }
  return new Date(instant).toISOString();
}
