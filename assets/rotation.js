// Shared "topic of the day" rotation logic.
// Must stay in sync with scripts/send-daily-email.mjs (same formula, same ROTATION_START).
const ROTATION_START = "2026-01-01"; // epoch day 0 for the rotation
const ROTATION_TZ = "Asia/Kolkata"; // the day boundary is anchored to the recipient's local day

function kolkataDateParts(date) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: ROTATION_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function daysBetween(isoA, isoB) {
  const a = new Date(`${isoA}T00:00:00Z`);
  const b = new Date(`${isoB}T00:00:00Z`);
  return Math.floor((b - a) / 86400000);
}

export function dailyIndex(totalCount, date = new Date()) {
  const today = kolkataDateParts(date);
  const dayNumber = daysBetween(ROTATION_START, today);
  const idx = ((dayNumber % totalCount) + totalCount) % totalCount;
  return idx;
}

export function todayLabel(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ROTATION_TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
