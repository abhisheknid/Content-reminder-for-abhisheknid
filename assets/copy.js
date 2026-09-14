// Shared nudge/starter-question copy. Used by both index.html and scripts/send-daily-email.mjs
// so the website and the email always say the same thing for the same day.

export function pickNudge(title) {
  const nudges = [
    `Set a 10-minute timer. You don't have to finish "${title.toLowerCase()}" — you just have to start it.`,
    `Don't outline. Just write the first true sentence about "${title.toLowerCase()}" and see where it goes.`,
    `Talk it out loud for 60 seconds like you're explaining it to a friend, then type what you just said.`,
    `Lower the bar: three rough sentences count as a win today.`,
  ];
  const seed = title.length + title.charCodeAt(0);
  return nudges[seed % nudges.length];
}

export function starterQuestions() {
  return [
    "Start here: what's the first specific moment that comes to mind?",
    "Push further: what would you say if no one from work would read this?",
    "Land it: what's the one line you'd want someone to remember?",
  ];
}
