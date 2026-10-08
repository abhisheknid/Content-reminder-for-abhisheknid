# Daily Writing Prompt

A small site + automation that:

1. **Emails one writing prompt a day** to `abhishek@dopami.app` at **9:00am IST**, with a
   low-friction nudge to actually start writing.
2. **Emails 3 reel ideas every Monday** at **1:00pm IST** — one pick from each content pillar
   (Seen, Helped, Belong) of the Dopami/Done Together reel idea bank.
3. **Publishes a browsable site** ([GitHub Pages](#3-turn-on-github-pages)) with all 230 writing
   prompts organized into 12 pillars, the 104-shot B-roll list, and the 100 reel ideas — all
   searchable/browsable, with today's/this-week's pick highlighted.

The writing-prompt bank lives in [`data/topics.json`](data/topics.json) — 230 recurring prompts
across 12 pillars (Building & Creating, Lessons & Learning, Principles & Philosophy,
Failure/Change/Growth, Contrarian POV, Work & Career, Curiosity & Thinking, People & Relationships,
Life & Personal Evolution, Behind-the-Scenes, the "One Idea" series, and "Founder Philosophy"). The
idea: the company is the laboratory — write about *how you think*, not just what you shipped.

The reel idea bank lives in [`data/reels.json`](data/reels.json) — 100 short-form video ideas across
3 pillars (Seen #1–40, Helped #41–75, Belong #76–100), for Dopami and Done Together's content
calendar. Browse it at [`reels.html`](reels.html).

## How the daily rotation works

Both the email and the site compute "today's prompt" the same way (see
[`assets/rotation.js`](assets/rotation.js)): the number of days since `2026-01-01`, measured in the
`Asia/Kolkata` timezone so the day boundary matches when the email actually lands, modulo 230. That
means every prompt gets used once every ~230 days (7.5 months), deterministically, with no database
or state to maintain — the site and the email will always agree on what "today" is.

## How the weekly reel-ideas rotation works

Each Monday, [`assets/reelRotation.js`](assets/reelRotation.js) computes a week number the same way
`rotation.js` computes a day number (days since `2026-01-01` in `Asia/Kolkata`, this time divided by
7), then picks one idea from **each** pillar by that week number modulo that pillar's own length. So
Seen (40 ideas) repeats every 40 weeks, Helped (35) every 35 weeks, and Belong (25) every 25 weeks —
each pillar cycles independently and deterministically, no state to maintain.

## How the emails are actually sent (currently active)

Both the 9am daily prompt and the Monday 1pm reel ideas run as **Claude Routines** (scheduled
triggers) bound to the Claude Code session that built this project, which already has your Gmail
account connected — so they send through that connection directly, with no SMTP password stored
anywhere. There's nothing to configure for this path; both are already running.

[`.github/workflows/daily-email.yml`](.github/workflows/daily-email.yml) and
[`.github/workflows/weekly-reels-email.yml`](.github/workflows/weekly-reels-email.yml) are kept as
**independent, manual-only backups** (see below) in case you'd rather move either send onto GitHub's
own infrastructure instead of relying on a Claude session. Don't enable both paths for the same email
at once — that would double-send.

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
| `EMAIL_TO` | `abhishek@dopami.app` | Who receives the emails |
| `SITE_URL` | `https://abhisheknid.github.io/Content-reminder-for-abhisheknid` | Linked from both emails; update if you rename the repo or use a custom domain. Case matters — must match the repo name's exact casing. |

(These secrets/variables are shared by both `daily-email.yml` and `weekly-reels-email.yml`.)

### 3. Turn on GitHub Pages

**Settings → Pages → Source: "GitHub Actions"**. The [`deploy-pages.yml`](.github/workflows/deploy-pages.yml)
workflow publishes the site automatically on every push to `main`. First deploy can take a minute or
two; after that your site is live at the `SITE_URL` above.

### 4. (Optional) Switch fully to the GitHub Actions backup path

To stop relying on the Claude Routine and run entirely on GitHub's infra instead: uncomment the
`schedule:` block in [`daily-email.yml`](.github/workflows/daily-email.yml) and/or
[`weekly-reels-email.yml`](.github/workflows/weekly-reels-email.yml), make sure secrets are set
(step 2), and ask whoever set up the Claude Routine to disable/delete the matching one so you don't
get two emails. GitHub disables scheduled workflows automatically after **60 days with no repository
activity** — something to know if you go this route.

## Testing

**Preview an email without sending it:**
```bash
npm install
DRY_RUN=1 node scripts/send-daily-email.mjs
DRY_RUN=1 node scripts/send-weekly-reels-email.mjs
```

**Send a real test email right now** (after secrets are configured): go to
**Actions → Send daily writing prompt email → Run workflow** (or **Send weekly reel ideas email**),
or run locally:
```bash
GMAIL_USER=you@gmail.com GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx EMAIL_TO=abhishek@dopami.app \
  node scripts/send-daily-email.mjs
# or
GMAIL_USER=you@gmail.com GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx EMAIL_TO=abhishek@dopami.app \
  node scripts/send-weekly-reels-email.mjs
```

**Preview the site locally:**
```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Project structure

```
data/topics.json                    the 230 writing prompts, grouped into 12 categories
data/broll.json                     104 B-roll shots, grouped into 8 categories
data/reels.json                     100 reel ideas, grouped into 3 pillars (Seen/Helped/Belong)
data/ads.json                       39 ad angles/formats, grouped into 6 categories
data/streams.json                   livestreaming playbook (generic + Dopami worked example), 2 categories
assets/rotation.js                  shared "what's today's prompt" logic (site + daily email)
assets/reelRotation.js              shared "this week's 3 reel ideas" logic (site + weekly email)
assets/copy.js                      shared nudge / starter-question copy (site + daily email)
assets/style.css                    site styling
index.html                          today's prompt + nudge
topics.html                         browse all writing prompts by category, with search
broll.html                          browse all B-roll shots by category, with a random shooting tip
reels.html                          browse all 100 reel ideas by pillar
ads.html                             browse all 39 ad angles/formats, grouped by category, plus a "start here" and run-it playbook
streams.html                         livestreaming playbook for earning new reach, generic + a Dopami worked example per idea
scripts/send-daily-email.mjs        daily writing-prompt email sender (Nodemailer + Gmail SMTP)
scripts/send-weekly-reels-email.mjs weekly 3-reel-ideas email sender (Nodemailer + Gmail SMTP)
.github/workflows/daily-email.yml         cron trigger for the daily email (manual/backup)
.github/workflows/weekly-reels-email.yml  cron trigger for the weekly reels email (manual/backup)
.github/workflows/deploy-pages.yml        deploys the site to GitHub Pages
```
