import fs from "node:fs";

const d = JSON.parse(fs.readFileSync(new URL("../data/linkedin-viral.json", import.meta.url), "utf8"));
const errors = [];

if (!/^\d{4}-\d{2}$/.test(d.month)) errors.push(`month must be YYYY-MM, got ${d.month}`);
if (d.themes.length !== 5) errors.push(`expected 5 themes, got ${d.themes.length}`);
for (const t of d.themes) {
  if (t.prompts.length !== 10) errors.push(`theme "${t.title}" has ${t.prompts.length} prompts, expected 10`);
}

const prompts = d.themes.flatMap((t) => t.prompts);
const nums = prompts.map((p) => p.num).sort((a, b) => a - b);
if (nums.join() !== Array.from({ length: 50 }, (_, i) => i + 1).join()) errors.push("prompt numbers must be exactly 1–50");
for (const p of prompts) {
  if (!p.hook || !p.prompt || !p.format) errors.push(`prompt #${p.num} is missing hook, prompt or format`);
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const current = new Set();
for (const p of prompts) {
  const k = norm(p.hook);
  if (current.has(k)) errors.push(`duplicate hook this month: #${p.num}`);
  current.add(k);
}
for (const m of d.archive) {
  if (m.month === d.month) errors.push(`archive already contains the current month ${d.month}`);
  for (const old of m.hooks) {
    if (current.has(norm(old))) errors.push(`hook reused from ${m.month}: "${old}"`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`OK: ${d.monthLabel}, 50 prompts across 5 themes, ${d.archive.length} archived month(s), no reused hooks.`);
