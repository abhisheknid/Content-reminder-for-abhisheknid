// Weekly "3 reel ideas, one per pillar" rotation.
// Must stay in sync with scripts/send-weekly-reels-email.mjs (same formula, same ROTATION_START).
const ROTATION_START = "2026-01-01"; // same epoch as assets/rotation.js, for one shared mental model
const ROTATION_TZ = "Asia/Kolkata";

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

export function weekNumber(date = new Date()) {
  const today = kolkataDateParts(date);
  const dayNumber = daysBetween(ROTATION_START, today);
  return Math.floor(dayNumber / 7);
}

// Returns one idea per pillar, cycling independently through each pillar's own list
// (so a 40-idea pillar repeats every 40 weeks, a 25-idea pillar every 25 weeks).
export function weeklyPicks(pillars, date = new Date()) {
  const week = weekNumber(date);
  return pillars.map((p) => {
    const idx = ((week % p.ideas.length) + p.ideas.length) % p.ideas.length;
    return { pillar: p, idea: p.ideas[idx] };
  });
}
