import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nodemailer from "nodemailer";
import { dailyIndex, todayLabel } from "../assets/rotation.js";
import { pickNudge, starterQuestions } from "../assets/copy.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DRY_RUN = process.env.DRY_RUN === "1";
const GMAIL_USER = DRY_RUN ? process.env.GMAIL_USER || "dry-run@example.com" : requireEnv("GMAIL_USER");
const GMAIL_APP_PASSWORD = DRY_RUN ? "dry-run" : requireEnv("GMAIL_APP_PASSWORD");
const EMAIL_TO = process.env.EMAIL_TO || "abhishek@dopami.app";
const SITE_URL = (process.env.SITE_URL || "https://abhisheknid.github.io/content-reminder-for-abhisheknid").replace(/\/$/, "");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

function loadTopics() {
  const raw = fs.readFileSync(path.join(__dirname, "..", "data", "topics.json"), "utf8");
  return JSON.parse(raw);
}

function buildEmail(today, data) {
  const starters = starterQuestions();
  const nudge = pickNudge(today.title);
  const date = todayLabel();

  const starterHtml = starters
    .map((s) => {
      const [label, rest] = s.split(/:\s(.+)/);
      return `<li style="margin:0 0 8px;"><strong>${label}:</strong> ${rest}</li>`;
    })
    .join("");

  const html = `
  <div style="font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#faf8f5;padding:28px 16px;">
    <div style="max-width:560px;margin:0 auto;">
      <p style="font-size:12.5px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#3d5a80;margin:0 0 8px;">${date}</p>
      <h1 style="font-size:24px;line-height:1.25;margin:0 0 20px;color:#24211d;">Today, write about one thing.</h1>

      <div style="background:#ffffff;border:1px solid #e7e1d8;border-radius:16px;padding:26px;">
        <span style="display:inline-block;font-size:12.5px;font-weight:700;color:#3d5a80;background:#eef2f7;padding:5px 11px;border-radius:100px;margin-bottom:14px;">${today.categoryName}</span>
        <h2 style="font-size:22px;line-height:1.3;margin:0 0 16px;color:#24211d;">"${today.title}"</h2>
        <p style="font-size:15px;color:#635d54;margin:0 0 20px;padding:14px 16px;background:#fdece7;border-left:3px solid #e07a5f;border-radius:8px;">${nudge}</p>
        <ul style="padding:0 0 0 18px;margin:0 0 22px;font-size:14.5px;color:#635d54;">${starterHtml}</ul>
        <a href="https://docs.google.com/document/create" style="display:inline-block;background:#3d5a80;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 20px;border-radius:100px;">Start writing this →</a>
      </div>

      <p style="font-size:13px;color:#635d54;margin-top:22px;">
        Prompt #${today.id} of 230, from the <strong>${today.categoryName}</strong> pillar.
        <a href="${SITE_URL}/topics.html" style="color:#3d5a80;">Browse all topics by category →</a>
      </p>
    </div>
  </div>`;

  const text = [
    `${date}`,
    ``,
    `TODAY'S PROMPT (#${today.id} of ${data.total} — ${today.categoryName})`,
    `"${today.title}"`,
    ``,
    nudge,
    ``,
    ...starters.map((s) => `- ${s}`),
    ``,
    `Start writing: https://docs.google.com/document/create`,
    `Browse all topics: ${SITE_URL}/topics.html`,
  ].join("\n");

  return {
    subject: `✍️ Today's prompt: ${today.title}`,
    html,
    text,
  };
}

async function main() {
  const data = loadTopics();
  const allItems = data.categories.flatMap((c) =>
    c.items.map((it) => ({ ...it, categoryName: c.name, categorySlug: c.slug }))
  );
  const idx = dailyIndex(data.total);
  const today = allItems[idx];

  const { subject, html, text } = buildEmail(today, data);

  if (DRY_RUN) {
    console.log(`[DRY RUN] Would send prompt #${today.id} ("${today.title}") to ${EMAIL_TO}`);
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
    from: `"Daily Writing Prompt" <${GMAIL_USER}>`,
    to: EMAIL_TO,
    subject,
    text,
    html,
  });

  console.log(`Sent prompt #${today.id} ("${today.title}") to ${EMAIL_TO}`);
}

main().catch((err) => {
  console.error("Failed to send daily prompt email:", err);
  process.exit(1);
});
