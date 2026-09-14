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

  const headingFont = "'Arial Black', Arial, 'Segoe UI', system-ui, sans-serif";
  const bodyFont = "'Segoe UI', system-ui, -apple-system, sans-serif";

  const html = `
  <div style="font-family:${bodyFont};background:#faf9f6;padding:28px 16px;">
    <div style="max-width:560px;margin:0 auto;">
      <p style="font-family:${headingFont};font-size:12.5px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:#6b6a63;margin:0 0 10px;">${date}</p>
      <h1 style="font-family:${headingFont};font-weight:800;font-size:26px;line-height:1.15;letter-spacing:-0.01em;margin:0 0 22px;color:#14130f;">Today,<br />write one thing.</h1>

      <div style="background:#ffffff;border:1px solid #e7e3da;border-radius:18px;padding:28px;">
        <span style="display:inline-block;font-family:${headingFont};font-size:12px;font-weight:800;letter-spacing:0.03em;text-transform:uppercase;color:#6b6a63;margin-bottom:16px;">● ${today.categoryName}</span>
        <h2 style="font-family:${headingFont};font-weight:800;font-size:22px;line-height:1.25;letter-spacing:-0.01em;margin:0 0 16px;color:#14130f;">"${today.title}"</h2>
        <p style="font-size:15px;color:#14130f;margin:0 0 22px;padding:16px 18px;background:#fbe9d6;border-radius:12px;">${nudge}</p>
        <ul style="padding:0 0 0 18px;margin:0 0 24px;font-size:14.5px;color:#6b6a63;">${starterHtml}</ul>
        <a href="https://docs.google.com/document/create" style="display:inline-block;background:#14130f;color:#faf9f6;text-decoration:none;font-family:${headingFont};font-weight:800;font-size:15px;padding:14px 24px;border-radius:100px;">Start writing this →</a>
      </div>

      <p style="font-size:13px;color:#6b6a63;margin-top:22px;">
        Prompt #${today.id} of 230, from the <strong style="color:#14130f;">${today.categoryName}</strong> pillar.
        <a href="${SITE_URL}/topics.html" style="color:#14130f;font-weight:700;">Browse all topics by category →</a>
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
