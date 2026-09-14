# Daily Writing Prompt

A small site + automation that:

1. **Emails one writing prompt a day** to `abhishek@dopami.app` at **9:00am IST**, with a
   low-friction nudge to actually start writing.
2. **Publishes a browsable site** ([GitHub Pages](#3-turn-on-github-pages)) with all 230 prompts,
   organized into 12 pillars, searchable, with today's pick highlighted.

The prompt bank lives in [`data/topics.json`](data/topics.json) — 230 recurring prompts across 12
pillars (Building & Creating, Lessons & Learning, Principles & Philosophy, Failure/Change/Growth,
Contrarian POV, Work & Career, Curiosity & Thinking, People & Relationships, Life & Personal
Evolution, Behind-the-Scenes, the "One Idea" series, and "Founder Philosophy"). The idea: the
company is the laboratory — write about *how you think*, not just what you shipped.

## How the daily rotation works

Both the email and the site compute "today's prompt" the same way (see
[`assets/rotation.js`](assets/rotation.js)): the number of days since `2026-01-01`, measured in the
`Asia/Kolkata` timezone so the day boundary matches when the email actually lands, modulo 230. That
means every prompt gets used once every ~230 days (7.5 months), deterministically, with no database
or state to maintain — the site and the email will always agree on what "today" is.

## How the daily email is actually sent (currently active)

The live 9am IST send runs as a **Claude Routine** (a scheduled trigger) bound to the Claude Code
session that built this project, which already has your Gmail account connected — so it sends
through that connection directly, with no SMTP password stored anywhere. There's nothing to
configure for this path; it's already running.

[`.github/workflows/daily-email.yml`](.github/workflows/daily-email.yml) is kept as an **independent,
manual-only backup** (see below) in case you'd rather move the send onto GitHub's own infrastructure
instead of relying on a Claude session. Don't enable both at once — that would double-send.

### 1. (Optional) Generate a Gmail App Password — only if you want the GitHub Actions backup path

The email is sent via Gmail SMTP using an **App Password** (not your normal Gmail password):

1. Turn on 2-Step Verification on the sending Google account, if not already on:
   https://myaccount.google.com/security
2. Go to https://myaccount.google.com/apppasswords and create an app password (name it e.g.
   "Daily Prompt Emailer"). Copy the 16-character password.

You can use `abhishek@dopami.app` itself as the sender if it's a Google Workspace account with
IMAP/SMTP enabled, or any other Gmail address you control — the recipient is configured separately.

### 2. (Optional) Add GitHub Actions secrets & variables — only for the backup path

In the repo: **Settings → Secrets and variables → Actions**

**Secrets** (Repository secrets tab):
| Name | Value |
|---|---|
| `GMAIL_USER` | The Gmail address sending the email |
| `GMAIL_APP_PASSWORD` | The 16-character app password from step 1 |

**Variables** (Variables tab, optional — sensible defaults are built in):
| Name | Default | Purpose |
|---|---|---|
| `EMAIL_TO` | `abhishek@dopami.app` | Who receives the daily prompt |
| `SITE_URL` | `https://abhisheknid.github.io/content-reminder-for-abhisheknid` | Linked from the email; update if you rename the repo or use a custom domain |

### 3. Turn on GitHub Pages

**Settings → Pages → Source: "GitHub Actions"**. The [`deploy-pages.yml`](.github/workflows/deploy-pages.yml)
workflow publishes the site automatically on every push to `main`. First deploy can take a minute or
two; after that your site is live at the `SITE_URL` above.

### 4. (Optional) Switch fully to the GitHub Actions backup path

To stop relying on the Claude Routine and run entirely on GitHub's infra instead: uncomment the
`schedule:` block in [`daily-email.yml`](.github/workflows/daily-email.yml), make sure secrets are
set (step 2), and ask whoever set up the Claude Routine to disable/delete it so you don't get two
emails. GitHub disables scheduled workflows automatically after **60 days with no repository
activity** — something to know if you go this route.

## Testing

**Preview the email without sending it:**
```bash
npm install
DRY_RUN=1 node scripts/send-daily-email.mjs
```

**Send a real test email right now** (after secrets are configured): go to
**Actions → Send daily writing prompt email → Run workflow**, or run locally:
```bash
GMAIL_USER=you@gmail.com GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx EMAIL_TO=abhishek@dopami.app \
  node scripts/send-daily-email.mjs
```

**Preview the site locally:**
```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Project structure

```
data/topics.json           the 230 prompts, grouped into 12 categories
assets/rotation.js          shared "what's today's prompt" logic (site + email)
assets/copy.js               shared nudge / starter-question copy (site + email)
assets/style.css             site styling
index.html                   today's prompt + nudge
topics.html                  browse all prompts by category, with search
scripts/send-daily-email.mjs the email sender (Nodemailer + Gmail SMTP)
.github/workflows/daily-email.yml    cron trigger for the email
.github/workflows/deploy-pages.yml   deploys the site to GitHub Pages
```
