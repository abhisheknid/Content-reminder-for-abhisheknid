import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nodemailer from "nodemailer";
import { weeklyPicks, weekNumber } from "../assets/reelRotation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DRY_RUN = process.env.DRY_RUN === "1";
const GMAIL_USER = DRY_RUN ? process.env.GMAIL_USER || "dry-run@example.com" : requireEnv("GMAIL_USER");
const GMAIL_APP_PASSWORD = DRY_RUN ? "dry-run" : requireEnv("GMAIL_APP_PASSWORD");
const EMAIL_TO = process.env.EMAIL_TO || "abhishek@dopami.app";
const SITE_URL = (process.env.SITE_URL || "https://abhisheknid.github.io/Content-reminder-for-abhisheknid").replace(/\/$/, "");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

function loadReels() {
  const raw = fs.readFileSync(path.join(__dirname, "..", "data", "reels.json"), "utf8");
  return JSON.parse(raw);
}

function weekLabel() {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

function buildEmail(picks) {
  const date = weekLabel();
  const headingFont = "'Arial Black', Arial, 'Segoe UI', system-ui, sans-serif";
  const bodyFont = "'Segoe UI', system-ui, -apple-system, sans-serif";

  const cards = picks
    .map(
      ({ pillar, idea }) => `
        <div style="background:#ffffff;border:1px solid #e7e3da;border-radius:18px;padding:24px;margin-bottom:16px;">
          <span style="display:inline-block;font-family:${headingFont};font-size:12px;font-weight:800;letter-spacing:0.03em;text-transform:uppercase;color:#6b6a63;margin-bottom:12px;">● ${pillar.name} · Goal: ${pillar.goal}</span>
          <h2 style="font-family:${headingFont};font-weight:800;font-size:19px;line-height:1.3;letter-spacing:-0.01em;margin:0 0 10px;color:#14130f;">#${idea.num} · ${idea.title}</h2>
          <p style="font-size:14.5px;color:#14130f;margin:0 0 10px;line-height:1.5;">${idea.description}</p>
          <p style="font-size:12.5px;color:#6b6a63;margin:0;font-style:italic;">${idea.format} · ${idea.duration}</p>
        </div>`
    )
    .join("");

  const html = `
  <div style="font-family:${bodyFont};background:#faf9f6;padding:28px 16px;">
    <div style="max-width:560px;margin:0 auto;">
      <p style="font-family:${headingFont};font-size:12.5px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:#6b6a63;margin:0 0 10px;">${date}</p>
      <h1 style="font-family:${headingFont};font-weight:800;font-size:26px;line-height:1.15;letter-spacing:-0.01em;margin:0 0 22px;color:#14130f;">This week,<br />3 reels to make.</h1>
      ${cards}
      <p style="font-size:13px;color:#6b6a63;margin-top:22px;">
        One idea from each pillar — Seen, Helped, Belong.
        <a href="${SITE_URL}/reels.html" style="color:#14130f;font-weight:700;">Browse all 100 reel ideas →</a>
      </p>
    </div>
  </div>`;

  const text = [
    date,
    "",
    "THIS WEEK'S 3 REEL IDEAS",
    "",
    ...picks.flatMap(({ pillar, idea }) => [
      `${pillar.name.toUpperCase()} (goal: ${pillar.goal})`,
      `#${idea.num} · ${idea.title}`,
      idea.description,
      `${idea.format} · ${idea.duration}`,
      "",
    ]),
    `Browse all 100 reel ideas: ${SITE_URL}/reels.html`,
  ].join("\n");

  return {
    subject: `🎬 This week's 3 reel ideas (Seen · Helped · Belong)`,
    html,
    text,
  };
}

async function main() {
  const data = loadReels();
  const picks = weeklyPicks(data.pillars);
  const week = weekNumber();

  const { subject, html, text } = buildEmail(picks);

  if (DRY_RUN) {
    console.log(`[DRY RUN] Week ${week} — would send to ${EMAIL_TO}:`);
    picks.forEach(({ pillar, idea }) => console.log(`  ${pillar.name}: #${idea.num} "${idea.title}"`));
    console.log(`Subject: ${subject}`);
    console.log("---- text body ----");
    console.log(text);
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });

  await transporter.sendMail({
    from: `"Reel Ideas" <${GMAIL_USER}>`,
    to: EMAIL_TO,
    subject,
    text,
    html,
  });

  console.log(`Sent week ${week}'s 3 reel ideas to ${EMAIL_TO}`);
}

main().catch((err) => {
  console.error("Failed to send weekly reel ideas email:", err);
  process.exit(1);
});
