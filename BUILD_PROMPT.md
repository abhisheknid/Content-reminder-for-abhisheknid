# Build prompt: Content Playbook OS (multi-client)

> Paste this whole file into a fresh Claude Code session in an empty repository. Everything the build needs is in this file: the brief, the architecture, the acceptance tests, and (in the appendix) every piece of content and logic from the original Dopami prototype, copied verbatim.

---

## 1. What you are building

A web app that a content, brand and marketing team uses as its **shared playbook and production system across multiple clients**.

It grows out of a working prototype: a static site plus scheduled emails that served one brand, Dopami (an ADHD-management startup). The prototype has 5 content libraries, 2 scheduled email rotations, and a consistent visual style. All of it is in the appendix. Your job is to rebuild it as a multi-client product that:

1. Keeps the **playbook generic and reusable** (ad formats, stream moves, B-roll shot types, reel and writing patterns).
2. Holds **client-specific context** separately: voice, audience, pillars, proof level, claims to avoid, and a per-client example for each playbook item.
3. Turns every library item into an **action** (a brief, a task, an approval, a logged result) instead of a read-only card.
4. Uses **Claude** for the production work: hooks, variants, scripts, clip-finding, repurposing, and a claims and compliance check.
5. Adds what an agency needs: **funnels, lead capture, a content calendar, approvals, results tracking, and client reports**.

### Users and roles
- **Admin**: manages the workspace, clients, users and billing settings.
- **Strategist**: owns client profiles, funnels and angles, and approves briefs.
- **Creator / Editor**: picks up briefs, shoots and edits, and logs results.
- **Client viewer**: sees a clean client-facing view, approves or comments, and views reports. Never sees internal notes or warnings.

---

## 2. Before you write code, ask me these and wait for answers

1. **Internal tool or product?** Is this for one agency (one workspace) or for many agencies (multi-tenant, signups, billing)? Default if I don't answer: one workspace now, but model `Organization` from day one so going multi-tenant later is not a rewrite.
2. **Hosting and stack.** Is the default in §3 OK?
3. **Email provider** for scheduled sends (Resend, Postmark, SES, or Gmail OAuth).
4. **Dopami continuity.** Should this app take over the existing Dopami daily-prompt and weekly-reel emails? If yes, the rotation must produce exactly the same picks (see §8).

Then propose a short plan per phase, and build phase by phase. Show me each phase working before starting the next.

---

## 3. Default stack (change only with a stated reason)

- **Next.js** (current stable, App Router), **TypeScript** in strict mode, **Tailwind CSS**.
- **Postgres via Supabase**: Auth (email magic link plus Google), Row Level Security per organization and per client, Storage for assets.
- An ORM with migrations (Drizzle or Prisma) and an **idempotent seed script**.
- **Anthropic TypeScript SDK**, called server-side only. Use the `claude-api` skill before writing any Claude code, to get current model IDs, structured outputs and prompt caching right. Make model IDs environment-configurable: one variable for quality-critical tasks (claims check, scripts) and one for high-volume generation (hooks, variants).
- Scheduled jobs: platform cron (for example Vercel Cron) calling authenticated API routes.
- Testing: unit tests (Vitest), Playwright for key flows at desktop and 390px mobile width.
- Deployment: Vercel (or similar), with preview deployments per branch.

---

## 4. Information architecture

Group the navigation by job. Don't add a flat link for every library; the prototype had already reached 7 links.

- **Plan**: Client profile · Messaging grid · Funnels · Content pillars
- **Create**: Library (one place for every type: Writing prompts, Reel ideas, B-roll shots, Ad formats, Stream moves) · Brief builder · Claude studio
- **Ship**: Content calendar · Board (status pipeline) · Approvals
- **Capture**: Link-in-bio pages · Lead magnets · Forms and quizzes
- **Learn**: Results log · Angle × wrapper test grid · Winning ideas · Reports

A **client switcher** in the top bar sets the active client. Every page then filters to that client and shows that client's examples next to the generic playbook text.

**Global search plus filters** across all libraries:
- `type`
- `category`
- `clientStage` (no-proof / has-proof)
- `goal` (reach / trust / conversion)
- `effort` (phone-only / light / production)
- `funnelStage` (top / middle / bottom)
- `status for this client` (unused / in progress / tested / won / killed)

Every library page uses **one consistent template**: *Start here* (guidance, rendered as filter presets) → *Library* (cards) → *How to run it* (numbered steps).

---

## 5. Data model (starting point; refine it, but keep the concepts)

- `Organization`, `User`, `Membership(role)`
- `Client`: name, slug, voice notes, audience / ideal customer profile, pain points[], content pillars[], proof level (`no-proof` | `has-proof`), banned claims[], competitors[], primary CTA, brand colors and logo.
- `Library`: type ∈ {writing_prompt, reel_idea, broll_shot, ad_format, stream_move}, title, eyebrow, subtitle, startHere (rich), howToRun[] (steps), extras (JSONB, for things like filmingOrder, privacyChecklist, tips, starterSequence).
- `LibraryCategory`: library, number, title, blurb, sort.
- `LibraryItem`: library, category, number (keep the original numbering), title, body fields as JSONB (keep each type's original fields; see appendix), tags (clientStage, goal, effort, funnelStage), `isGeneric` (bool), internal warning text.
- `ClientExample`: client × item → example text (the "Dopami example" pattern).
- `ItemUsage`: client × item → status, notes, last used.
- `Brief`: client, source item(s), format, angle, hook(s), single claim, single CTA, script, shot list, due date, assignee, status.
- `ContentPiece`: brief → platform, asset files, caption, publish date, status (`idea → brief → scripting → shooting → editing → in review → approved → scheduled → published`).
- `Approval` and `Comment` (threaded; internal and client-visible flags).
- `ResultLog`: piece → spend, impressions, 3-second hook rate, hold rate, CTR, CPA, leads, sales, notes, verdict (`win` | `kill` | `iterate`).
- `Funnel`, `FunnelStage`, `FunnelStep`: map items and pieces to stages.
- `LeadMagnet`, `Form`, `Quiz`, `Lead` (with UTM source / medium / campaign / content), `BioPage`, `BioLink`.
- `Schedule`: client × library × role → cadence (daily / weekly), time, timezone, recipients, rotation rule.
- `EmailLog`: every send with its rotation inputs and output, so any send can be audited or replayed.

**Seed the import from the appendix exactly:**
- Writing prompts: 230 items in 12 categories, plus a 15-item `starterPack`.
- Reel ideas: 100 items in 3 pillars (Seen 40 / Helped 35 / Belong 25), with `howToUse` and `starterSequence`.
- B-roll shots: 104 items in 8 categories, with `filmingOrder`, `privacyChecklist` and 20 `tips`.
- Ad formats: 39 items in 6 categories, with `startHere`, `shipAdvice` and `howToRun`.
- Stream moves: 8 items in 2 categories, with `intro` and `howToRun`. Note: in `streams.json` the items array is keyed `ads`; normalize it to `items` on import.
- **Dopami** as the first `Client`. Content that is Dopami-specific becomes `ClientExample`s or Dopami-tagged items, not generic playbook text:
  - The "Dopami example:" half of each stream move's `why` becomes a `ClientExample`.
  - B-roll items naming Ankit, Somalika, Delhi-NCR, or the Dopami UI are Dopami-specific.
  - The reel ideas and the Done Together references are Dopami-specific.
  - Ad formats are generic. Examples like "r/ADHD" or "why does my focus crash at 3pm" are Dopami examples.

The seed must be re-runnable without creating duplicates.

---

## 6. Features by phase

### Phase 1: Playbook core (MVP)
- Auth, organization, roles, clients, client switcher, client profile form.
- Unified library: search, filters, tags, consistent page template, numbered cards, deep links to `#category`.
- Each card shows the generic text, plus the **active client's example** (editable inline), plus a **status chip** for this client.
- **"Use this" → Brief**: one click creates a brief already filled in with the client, item, format, a placeholder for one claim and one CTA, an assignee and a due date. The brief is shareable and printable/exportable to PDF and Markdown.
- **Cross-links**: each item links to related items in other libraries. Start with hand-made links (for example, Ad #23 Problem vs solution ↔ the reel ideas, B-roll shots and stream moves it would use). Later, Claude can suggest links.
- **On-set mode** (mobile-first): a tickable B-roll shot checklist for a shoot, plus the privacy checklist as a required sign-off before recording.
- **Random tip box** on B-roll (a new tip on each load), same as the prototype.
- **Scheduled emails**, per client and per role, built on the `Schedule` model. Port the two Dopami rotations with exact parity (§8). Keep the prototype's email template style (§7).

### Phase 2: Claude studio
All Claude calls are server-side, return structured JSON, are logged, and use prompt caching for the client profile plus library context.
- **Hook generator**: 5 hooks for an angle, in the client's voice, each under ~12 words, one per wrapper.
- **Variant generator**: one angle across N wrappers (the playbook rule is "same angle, different wrapper"; for example Notes app, Problem vs solution, 5 signs, Greenscreen demo), giving each a first-frame description, script, and on-screen text.
- **Script writer**: hook in the first second, product by second 4–6, one claim, one next step, captions burned in, no logo open. This is the playbook's own rule; enforce it in the output schema.
- **Script → B-roll shot list**, using the B-roll library first.
- **Stream → Shorts finder**: upload or paste a transcript (with timestamps) → 5–8 clip candidates (in/out times, title, hook, why it works) plus an outline for one 10–12 minute edit.
- **Repurposer**: one long piece becomes a carousel, a thread, a newsletter, Shorts, and new writing prompts.
- **Claims and compliance checker** (high priority): flags fake scarcity, invented news, unsourced statistics, fabricated or staged reviews and testimonials, faked Reddit threads or screenshots, medical or financial claims (especially from "experts" in AI podcast formats), and claims outside the client's banned list or proof level. Build its rules from the warnings already written in the ad-format items in the appendix (for example #2, #7, #9, #17, #28, #37). It returns: issue, quote, severity, why, suggested fix. Show it on every brief before approval.
- **Brand voice checker**: scores a draft against the client profile, with suggested line edits.
- Be explicit in the UI that Claude writes scripts, edit plans, shot lists and clip timestamps; it does **not** render video. Leave a clear integration point for third-party video tools.
- Package each Claude workflow as a reusable prompt template in the codebase (versioned), so they could also be shipped as Claude skills.

### Phase 3: Ship and capture
- Content calendar (per client and across all clients), a Kanban board, and approval flows with client-visible comments and version history.
- Client portal: a client-viewer login sees briefs and pieces waiting for approval, the calendar, and reports. Internal warnings are hidden.
- **Funnel builder**: stages top → middle → bottom, with library items and pieces dragged onto stages (for example: stream → Shorts → retargeting ad → offer). Templates for a starter funnel per client stage.
- **Offer builder**: guarantee, bundle and price anchor (the ad formats Offer #3 and Bundle #15 depend on these existing).
- **Lead capture**:
  - link-in-bio page per client with automatic UTM tags
  - form builder
  - quiz builder (example: Dopami "What's your focus type?")
  - lead magnet library (checklists and templates)
  - stream/webinar registration pages tied to the "end on one CTA" stream move
  - waitlist with referral tracking
  - comment-keyword DM automation: model it, but stub the Meta API integration behind an interface
- Leads view per client, with CSV export and webhook-out.

### Phase 4: Learn
- **Results log** per piece (manual entry plus CSV import first; ad-platform APIs later).
- **Angle × wrapper test grid**: the matrix of what's been tested and how it did. Winners and killed formats are obvious at a glance. Encode the playbook's kill rule as a default flag: below the 3-second hold-rate threshold, suggest killing it.
- **Winning ideas library** shared across clients (anonymized), feeding back into item tags.
- **Weekly client report**, auto-generated (Claude summary plus charts) and emailed or shared via a portal link.

---

## 7. Design system: carry over the prototype's look

- Heavy, bold display headings (Plus Jakarta Sans 800) with simple body text (system UI stack). **Black filled CTAs** (pill buttons, `--ink` background). Warm off-white background, amber accent. Light and dark themes.
- Tokens from the prototype (light / dark):
  - `--bg #faf9f6 / #15140f`
  - `--surface #ffffff / #201f1a`
  - `--ink #14130f / #f5f3ec`
  - `--ink-soft #6b6a63 / #b3ada0`
  - `--accent #d98a3d / #e9a860`
  - `--accent-soft #fbe9d6 / #3a2c1a`
  - `--border #e7e3da / #35322a`
  - radius 20px for panels, 12–14px for cards
- Components to keep:
  - an eyebrow (amber dot plus uppercase label)
  - category pill nav with counts
  - numbered cards (amber number badge, bold name, body, italic footnote under a divider for the warning or "why")
  - info boxes with numbered steps (black circle numbers) and ✓ checklists
  - a dashed-amber tip box
  - an amber "nudge" callout
- The nav must wrap cleanly at 390px wide, with no horizontal scroll. (The prototype hit both of these bugs. Also cache-bust or hash static assets.)
- Email template: the same visual language, written for email clients (inline styles, `'Arial Black', Arial` heading stack, black pill CTA, amber nudge callout, a link back to the relevant library page). The originals are in Appendix F.

---

## 8. Rotation logic: must match the prototype exactly

- **Daily writing prompt**: `dayNumber = days between 2026-01-01 and today's calendar date in Asia/Kolkata`; `index = ((dayNumber % 230) + 230) % 230` into the flattened list of prompts, in category order. The nudge comes from `pickNudge(title)` and the starter questions from `starterQuestions()` (Appendix E). Subject line: `✍️ Today's prompt: {title}`. Sends at 09:00 IST.
- **Weekly reel ideas**: `week = floor(dayNumber / 7)`; for each pillar, `idea = pillar.ideas[week % pillar.ideas.length]`, so each pillar cycles on its own length. Subject line: `🎬 This week's 3 reel ideas (Seen · Helped · Belong)`. Sends Mondays at 13:00 IST.
- Generalize both into the `Schedule` model (start date, timezone, cadence, per-library rule), but the Dopami schedules must keep these exact parameters.
- **Parity tests (all must pass):**
  - 2026-10-04 IST → prompt #47 "My Personal Operating System"
  - 2026-10-05 IST → #48 "The Mental Models I Use"
  - 2026-10-06 IST → #49 "The Questions I Ask Before Deciding"
  - 2026-10-07 IST → #50 "What I Optimize For"
  - 2026-10-08 IST → #51 "What I Refuse to Optimize For"
  - Monday 2026-10-05 IST (week 39) → Seen #40, Helped #45, Belong #90
  - Week 38 → Seen #39, Helped #44, Belong #89. Week 40 → Seen #1 (wraps), Helped #46, Belong #91. Week 41 → Seen #2, Helped #47, Belong #92.
  - Day-boundary test: 2026-10-07T18:29:59Z and 2026-10-07T18:30:00Z fall on different IST days.
- A scheduled job must **always send** once per period. No skipping or deduplication based on content. It must be safe to retry (idempotency key = schedule + period) and logged in `EmailLog`.
- Link URLs come from one config value (a case-sensitivity bug in a hardcoded URL once shipped broken links in the prototype's emails).

---

## 9. Non-functional requirements

- Row Level Security: users only see their organization's data. Client viewers only see their own client's client-visible records.
- No secrets in the repo. All keys come from environment variables; ship a `.env.example`.
- Accessibility: semantic HTML, keyboard navigable, AA contrast in both themes.
- Performance: library pages stay fast with thousands of items (server-side filtering, pagination or virtualization).
- Every Claude output is labeled as a draft and editable. Nothing auto-publishes.
- Content safety is built in: the generators must never fabricate reviews, statistics, news events, scarcity, or real-person endorsements. Run the claims checker on everything before approval.

---

## 10. Definition of done (per phase)

- Migrations, an idempotent seed, and a seed-count test: 230 / 100 / 104 / 39 / 8 items, 12 / 3 / 8 / 6 / 2 categories, 15 starter-pack items, 20 B-roll tips.
- Rotation parity tests (§8) pass.
- Playwright tests: switch client → filter library → "Use this" → brief → run the claims check → approve → appears on the calendar. Run at 1280px and 390px.
- A README covering setup, environment variables, seeding, cron setup, and how to add a client and a new library item.
- A short demo at the end of each phase: what works, what's stubbed, what's next.

---

## Appendix: all data and logic from the prototype (verbatim)

Source repo: `abhisheknid/Content-reminder-for-abhisheknid`. The files below are copied exactly. Import them; don't retype them.

### Appendix A — data/topics.json (230 writing prompts, 12 categories, 15-item starter pack)

Library type: writing_prompt. Daily rotation source.

```json
{
  "generatedFrom": "16-idea ADHD founder content bank, expanded to 230 recurring prompts across 12 pillars",
  "total": 230,
  "categories": [
    {
      "id": 1,
      "slug": "building-creating",
      "name": "Building & Creating",
      "blurb": "Vision, bets, and what building has actually taught you.",
      "items": [
        {
          "id": 1,
          "title": "The Future I’m Building"
        },
        {
          "id": 2,
          "title": "Why I’m Building This"
        },
        {
          "id": 3,
          "title": "What I’m Building That Doesn’t Exist Yet"
        },
        {
          "id": 4,
          "title": "The Problem I Can’t Stop Thinking About"
        },
        {
          "id": 5,
          "title": "What I’m Betting On"
        },
        {
          "id": 6,
          "title": "The Bet I’m Making"
        },
        {
          "id": 7,
          "title": "What I Think the Future Will Look Like"
        },
        {
          "id": 8,
          "title": "The World I Want to Help Create"
        },
        {
          "id": 9,
          "title": "What I’m Trying to Change"
        },
        {
          "id": 10,
          "title": "What I’m Learning While Building"
        },
        {
          "id": 11,
          "title": "The Work Behind The Work"
        },
        {
          "id": 12,
          "title": "The Work Nobody Sees"
        },
        {
          "id": 13,
          "title": "What Building Has Taught Me"
        },
        {
          "id": 14,
          "title": "What Nobody Tells You About Building"
        },
        {
          "id": 15,
          "title": "The Parts of Building I Didn’t Expect"
        },
        {
          "id": 16,
          "title": "What Looks Easy From The Outside"
        },
        {
          "id": 17,
          "title": "The Unsexy Work Behind The Vision"
        },
        {
          "id": 18,
          "title": "What I’m Currently Obsessed With"
        },
        {
          "id": 19,
          "title": "The Question I’m Building Around"
        },
        {
          "id": 20,
          "title": "What I’m Trying to Prove"
        }
      ]
    },
    {
      "id": 2,
      "slug": "lessons-learning",
      "name": "Lessons & Learning",
      "blurb": "What experience taught you that books didn't.",
      "items": [
        {
          "id": 21,
          "title": "A Lesson From Listening"
        },
        {
          "id": 22,
          "title": "A Lesson I Learned the Hard Way"
        },
        {
          "id": 23,
          "title": "Something I Understand Differently Now"
        },
        {
          "id": 24,
          "title": "What Changed My Mind"
        },
        {
          "id": 25,
          "title": "The Advice I Ignored"
        },
        {
          "id": 26,
          "title": "The Advice I Wish I’d Taken"
        },
        {
          "id": 27,
          "title": "What Experience Taught Me That Books Didn’t"
        },
        {
          "id": 28,
          "title": "What Failure Taught Me"
        },
        {
          "id": 29,
          "title": "What Success Taught Me"
        },
        {
          "id": 30,
          "title": "What I Learned Too Late"
        },
        {
          "id": 31,
          "title": "Something I Used to Believe"
        },
        {
          "id": 32,
          "title": "Something I No Longer Believe"
        },
        {
          "id": 33,
          "title": "The Lesson I Keep Relearning"
        },
        {
          "id": 34,
          "title": "What I’m Still Figuring Out"
        },
        {
          "id": 35,
          "title": "What I’m Currently Learning"
        },
        {
          "id": 36,
          "title": "A Mistake Worth Repeating"
        },
        {
          "id": 37,
          "title": "The Most Expensive Lesson I’ve Learned"
        },
        {
          "id": 38,
          "title": "The Lesson Behind a Decision"
        },
        {
          "id": 39,
          "title": "What Someone Else Taught Me"
        },
        {
          "id": 40,
          "title": "The One Thing This Experience Changed"
        }
      ]
    },
    {
      "id": 3,
      "slug": "principles-philosophy",
      "name": "Principles & Philosophy",
      "blurb": "Your operating system — rules, mental models, what you optimize for.",
      "items": [
        {
          "id": 41,
          "title": "The Principles I Follow"
        },
        {
          "id": 42,
          "title": "The Principles I Refuse to Compromise"
        },
        {
          "id": 43,
          "title": "What I Believe Will Matter"
        },
        {
          "id": 44,
          "title": "What I Believe No Longer Matters"
        },
        {
          "id": 45,
          "title": "The Rules I Live By"
        },
        {
          "id": 46,
          "title": "The Rules I Broke"
        },
        {
          "id": 47,
          "title": "My Personal Operating System"
        },
        {
          "id": 48,
          "title": "The Mental Models I Use"
        },
        {
          "id": 49,
          "title": "The Questions I Ask Before Deciding"
        },
        {
          "id": 50,
          "title": "What I Optimize For"
        },
        {
          "id": 51,
          "title": "What I Refuse to Optimize For"
        },
        {
          "id": 52,
          "title": "My Definition of Success"
        },
        {
          "id": 53,
          "title": "My Definition of Enough"
        },
        {
          "id": 54,
          "title": "What I Think Makes Great Work"
        },
        {
          "id": 55,
          "title": "What I Think Makes a Great Life"
        },
        {
          "id": 56,
          "title": "What I Value More With Age"
        },
        {
          "id": 57,
          "title": "What I Value Less With Age"
        },
        {
          "id": 58,
          "title": "The Difference Between Important and Urgent"
        },
        {
          "id": 59,
          "title": "What I Think Is Worth Sacrificing For"
        },
        {
          "id": 60,
          "title": "The Things I Won’t Trade for Success"
        }
      ]
    },
    {
      "id": 4,
      "slug": "failure-change-growth",
      "name": "Failure, Change & Growth",
      "blurb": "What failure took, what it gave, what you had to unlearn.",
      "items": [
        {
          "id": 61,
          "title": "What Changed After Failure"
        },
        {
          "id": 62,
          "title": "What Failure Took From Me"
        },
        {
          "id": 63,
          "title": "What Failure Gave Me"
        },
        {
          "id": 64,
          "title": "What I Would Do Differently"
        },
        {
          "id": 65,
          "title": "What I Would Never Do Again"
        },
        {
          "id": 66,
          "title": "The Decision That Changed Everything"
        },
        {
          "id": 67,
          "title": "The Period That Changed Me"
        },
        {
          "id": 68,
          "title": "What I Had to Let Go Of"
        },
        {
          "id": 69,
          "title": "What I’m Still Recovering From"
        },
        {
          "id": 70,
          "title": "What Starting Over Taught Me"
        },
        {
          "id": 71,
          "title": "What I Learned From Losing"
        },
        {
          "id": 72,
          "title": "What I Learned From Being Wrong"
        },
        {
          "id": 73,
          "title": "The Version of Me I Had to Outgrow"
        },
        {
          "id": 74,
          "title": "What I Had to Unlearn to Grow"
        },
        {
          "id": 75,
          "title": "Things I’m Unlearning"
        },
        {
          "id": 76,
          "title": "Things I’m Relearning"
        },
        {
          "id": 77,
          "title": "What I Wish I Knew 10 Years Ago"
        },
        {
          "id": 78,
          "title": "What I Would Tell My Younger Self"
        },
        {
          "id": 79,
          "title": "The Person I Was vs. The Person I’m Becoming"
        },
        {
          "id": 80,
          "title": "What Changed When I Stopped Trying to Prove Myself"
        }
      ]
    },
    {
      "id": 5,
      "slug": "contrarian-pov",
      "name": "Contrarian / Point of View",
      "blurb": "Unpopular opinions and what everyone gets wrong.",
      "items": [
        {
          "id": 81,
          "title": "Unpopular Business Opinion"
        },
        {
          "id": 82,
          "title": "Things I See Differently"
        },
        {
          "id": 83,
          "title": "An Opinion I Know People Will Disagree With"
        },
        {
          "id": 84,
          "title": "What Everyone Gets Wrong About ___"
        },
        {
          "id": 85,
          "title": "The Advice I Think Is Overrated"
        },
        {
          "id": 86,
          "title": "The Business Advice I’d Ignore"
        },
        {
          "id": 87,
          "title": "What I Think We’re Optimizing for Wrong"
        },
        {
          "id": 88,
          "title": "A Popular Idea I Don’t Buy"
        },
        {
          "id": 89,
          "title": "A “Bad” Idea I Think Is Actually Good"
        },
        {
          "id": 90,
          "title": "What Sounds Smart But Isn’t"
        },
        {
          "id": 91,
          "title": "What Looks Like Progress But Isn’t"
        },
        {
          "id": 92,
          "title": "What Nobody Is Talking About"
        },
        {
          "id": 93,
          "title": "The Problem With the Conventional Wisdom"
        },
        {
          "id": 94,
          "title": "What I’d Do If I Were Starting Today"
        },
        {
          "id": 95,
          "title": "What I’d Do If I Had $0"
        },
        {
          "id": 96,
          "title": "What I’d Do If I Had to Start Again"
        },
        {
          "id": 97,
          "title": "The Industry Assumption I’d Challenge"
        },
        {
          "id": 98,
          "title": "What I Think Will Be Obsolete"
        },
        {
          "id": 99,
          "title": "What I Think Will Become More Valuable"
        },
        {
          "id": 100,
          "title": "The Trend I Think People Are Underestimating"
        }
      ]
    },
    {
      "id": 6,
      "slug": "work-craft-career",
      "name": "Work, Craft & Career",
      "blurb": "Craft, hiring, management, and the work you want to be known for.",
      "items": [
        {
          "id": 101,
          "title": "The Work Nobody Sees"
        },
        {
          "id": 102,
          "title": "The Skill That Changed My Career"
        },
        {
          "id": 103,
          "title": "What Clients Taught Me"
        },
        {
          "id": 104,
          "title": "What Working With Great People Taught Me"
        },
        {
          "id": 105,
          "title": "What Bad Workplaces Taught Me"
        },
        {
          "id": 106,
          "title": "What Makes Someone Exceptional at Their Work"
        },
        {
          "id": 107,
          "title": "What I’ve Learned From Hiring"
        },
        {
          "id": 108,
          "title": "What I’ve Learned From Being Hired"
        },
        {
          "id": 109,
          "title": "What I’ve Learned From Managing People"
        },
        {
          "id": 110,
          "title": "What I’ve Learned From Being Managed"
        },
        {
          "id": 111,
          "title": "The Difference Between Good and Great Work"
        },
        {
          "id": 112,
          "title": "How I Decide What Deserves My Time"
        },
        {
          "id": 113,
          "title": "What I Don’t Do Anymore at Work"
        },
        {
          "id": 114,
          "title": "Things I No Longer Chase"
        },
        {
          "id": 115,
          "title": "The Career Advice I’d Give Today"
        },
        {
          "id": 116,
          "title": "What I Would Optimize My Career Around"
        },
        {
          "id": 117,
          "title": "The Career Mistake I Would Avoid"
        },
        {
          "id": 118,
          "title": "Why I Chose This Path"
        },
        {
          "id": 119,
          "title": "What My Career Has Prepared Me For"
        },
        {
          "id": 120,
          "title": "The Work I Want to Be Known For"
        }
      ]
    },
    {
      "id": 7,
      "slug": "curiosity-thinking",
      "name": "Curiosity & Thinking",
      "blurb": "Rabbit holes, patterns, and the questions you can't stop asking.",
      "items": [
        {
          "id": 121,
          "title": "What Keeps Me Curious"
        },
        {
          "id": 122,
          "title": "The Question I Can’t Stop Thinking About"
        },
        {
          "id": 123,
          "title": "Something I Changed My Mind About This Week"
        },
        {
          "id": 124,
          "title": "A Rabbit Hole I Went Down"
        },
        {
          "id": 125,
          "title": "Something I Learned Today"
        },
        {
          "id": 126,
          "title": "A Connection I Just Made"
        },
        {
          "id": 127,
          "title": "Two Things That Seem Unrelated But Aren’t"
        },
        {
          "id": 128,
          "title": "Something Everyone Should Think About"
        },
        {
          "id": 129,
          "title": "A Question With No Easy Answer"
        },
        {
          "id": 130,
          "title": "What I’m Trying to Understand"
        },
        {
          "id": 131,
          "title": "An Idea That Keeps Coming Back"
        },
        {
          "id": 132,
          "title": "A Pattern I’m Starting to Notice"
        },
        {
          "id": 133,
          "title": "Something I Read That Changed My Thinking"
        },
        {
          "id": 134,
          "title": "Something I Heard That Stayed With Me"
        },
        {
          "id": 135,
          "title": "The Most Interesting Thing I Learned This Week"
        },
        {
          "id": 136,
          "title": "A Thought I Can’t Quite Shake"
        },
        {
          "id": 137,
          "title": "The Rabbit Hole Worth Going Down"
        },
        {
          "id": 138,
          "title": "What I’m Curious About Next"
        },
        {
          "id": 139,
          "title": "The Connection Nobody Seems to Be Making"
        },
        {
          "id": 140,
          "title": "What This Made Me Think About"
        }
      ]
    },
    {
      "id": 8,
      "slug": "people-relationships",
      "name": "People & Relationships",
      "blurb": "What people — mentors, friends, difficult people — have taught you.",
      "items": [
        {
          "id": 141,
          "title": "What People Have Taught Me"
        },
        {
          "id": 142,
          "title": "The People Who Changed How I Think"
        },
        {
          "id": 143,
          "title": "What Great Leaders Have in Common"
        },
        {
          "id": 144,
          "title": "What I’ve Learned From Mentors"
        },
        {
          "id": 145,
          "title": "What I’ve Learned From Friends"
        },
        {
          "id": 146,
          "title": "What I’ve Learned From Difficult People"
        },
        {
          "id": 147,
          "title": "What Makes Me Trust Someone"
        },
        {
          "id": 148,
          "title": "What Makes Me Lose Trust"
        },
        {
          "id": 149,
          "title": "The Difference Between Charisma and Character"
        },
        {
          "id": 150,
          "title": "What I Look For in People"
        },
        {
          "id": 151,
          "title": "What I’ve Learned About Collaboration"
        },
        {
          "id": 152,
          "title": "What I’ve Learned About Conflict"
        },
        {
          "id": 153,
          "title": "What I’ve Learned About Boundaries"
        },
        {
          "id": 154,
          "title": "The Importance of Who You Surround Yourself With"
        },
        {
          "id": 155,
          "title": "People Who Challenge Your Thinking Are Valuable"
        },
        {
          "id": 156,
          "title": "What I Wish More People Understood About Ambition"
        }
      ]
    },
    {
      "id": 9,
      "slug": "life-personal-evolution",
      "name": "Life & Personal Evolution",
      "blurb": "What you're saying yes and no to, and the life you're designing.",
      "items": [
        {
          "id": 157,
          "title": "Things I’m No Longer Chasing"
        },
        {
          "id": 158,
          "title": "Things I Want More of"
        },
        {
          "id": 159,
          "title": "Things I Want Less of"
        },
        {
          "id": 160,
          "title": "What I’m Saying No To"
        },
        {
          "id": 161,
          "title": "What I’m Saying Yes To"
        },
        {
          "id": 162,
          "title": "What Feels Different This Year"
        },
        {
          "id": 163,
          "title": "What Matters More to Me Now"
        },
        {
          "id": 164,
          "title": "What Doesn’t Matter to Me Anymore"
        },
        {
          "id": 165,
          "title": "What I’m Protecting My Energy From"
        },
        {
          "id": 166,
          "title": "What Gives Me Energy"
        },
        {
          "id": 167,
          "title": "What Drains Me"
        },
        {
          "id": 168,
          "title": "What I’m Making More Time For"
        },
        {
          "id": 169,
          "title": "What I’m Making Less Time For"
        },
        {
          "id": 170,
          "title": "The Life I’m Designing"
        },
        {
          "id": 171,
          "title": "What Does “A Good Life” Mean to Me?"
        },
        {
          "id": 172,
          "title": "What I’m Learning About Happiness"
        },
        {
          "id": 173,
          "title": "What I’m Learning About Ambition"
        },
        {
          "id": 174,
          "title": "What I’m Learning About Freedom"
        },
        {
          "id": 175,
          "title": "What I’m Learning About Time"
        },
        {
          "id": 176,
          "title": "What I Don’t Want to Wake Up at 50 Regretting"
        }
      ]
    },
    {
      "id": 10,
      "slug": "behind-the-scenes",
      "name": "Behind-the-Scenes / Build in Public",
      "blurb": "Build in public: decisions, experiments, what users taught you.",
      "items": [
        {
          "id": 177,
          "title": "What Happened This Week"
        },
        {
          "id": 178,
          "title": "What Went Wrong This Week"
        },
        {
          "id": 179,
          "title": "What Went Surprisingly Right"
        },
        {
          "id": 180,
          "title": "The Decision I’m Wrestling With"
        },
        {
          "id": 181,
          "title": "The Decision We Just Made"
        },
        {
          "id": 182,
          "title": "Why We Chose X Over Y"
        },
        {
          "id": 183,
          "title": "The Experiment We’re Running"
        },
        {
          "id": 184,
          "title": "What We Expected vs. What Happened"
        },
        {
          "id": 185,
          "title": "What the Data Is Telling Us"
        },
        {
          "id": 186,
          "title": "What Users Are Teaching Us"
        },
        {
          "id": 187,
          "title": "What We Changed Because of Users"
        },
        {
          "id": 188,
          "title": "A Product Decision I Changed My Mind About"
        },
        {
          "id": 189,
          "title": "The Feature We Almost Built"
        },
        {
          "id": 190,
          "title": "The Feature We Killed"
        },
        {
          "id": 191,
          "title": "What We’re Not Building"
        },
        {
          "id": 192,
          "title": "The Problem We’re Still Trying to Solve"
        },
        {
          "id": 193,
          "title": "Our Biggest Assumption"
        },
        {
          "id": 194,
          "title": "The Assumption That Turned Out to Be Wrong"
        },
        {
          "id": 195,
          "title": "What Nobody Sees Behind the Launch"
        },
        {
          "id": 196,
          "title": "What Happens After the Launch"
        }
      ]
    },
    {
      "id": 11,
      "slug": "one-idea-series",
      "name": "The \"One Idea\" Series",
      "blurb": "Low-effort, high-frequency: one small idea, said clearly.",
      "items": [
        {
          "id": 197,
          "title": "One Idea I’m Thinking About"
        },
        {
          "id": 198,
          "title": "One Question I’m Exploring"
        },
        {
          "id": 199,
          "title": "One Thing I Learned Today"
        },
        {
          "id": 200,
          "title": "One Thing That Changed My Mind"
        },
        {
          "id": 201,
          "title": "One Pattern I Noticed"
        },
        {
          "id": 202,
          "title": "One Assumption I’m Challenging"
        },
        {
          "id": 203,
          "title": "One Belief I’m Testing"
        },
        {
          "id": 204,
          "title": "One Decision I’m Making"
        },
        {
          "id": 205,
          "title": "One Thing I’m Saying No To"
        },
        {
          "id": 206,
          "title": "One Thing I’m Grateful For"
        },
        {
          "id": 207,
          "title": "One Thing I’m Curious About"
        },
        {
          "id": 208,
          "title": "One Thing I’d Do Differently"
        },
        {
          "id": 209,
          "title": "One Thing I Wish I’d Known"
        },
        {
          "id": 210,
          "title": "One Idea Worth Stealing"
        },
        {
          "id": 211,
          "title": "One Idea Worth Rejecting"
        }
      ]
    },
    {
      "id": 12,
      "slug": "founder-philosophy",
      "name": "Your \"Founder Philosophy\" Series",
      "blurb": "How you think about risk, AI, leadership, legacy, and more.",
      "items": [
        {
          "id": 212,
          "title": "How I Think About Building"
        },
        {
          "id": 213,
          "title": "How I Think About Risk"
        },
        {
          "id": 214,
          "title": "How I Think About Failure"
        },
        {
          "id": 215,
          "title": "How I Think About Money"
        },
        {
          "id": 216,
          "title": "How I Think About Ambition"
        },
        {
          "id": 217,
          "title": "How I Think About Competition"
        },
        {
          "id": 218,
          "title": "How I Think About Talent"
        },
        {
          "id": 219,
          "title": "How I Think About Leadership"
        },
        {
          "id": 220,
          "title": "How I Think About Creativity"
        },
        {
          "id": 221,
          "title": "How I Think About Technology"
        },
        {
          "id": 222,
          "title": "How I Think About AI"
        },
        {
          "id": 223,
          "title": "How I Think About Design"
        },
        {
          "id": 224,
          "title": "How I Think About Customers"
        },
        {
          "id": 225,
          "title": "How I Think About Time"
        },
        {
          "id": 226,
          "title": "How I Think About Attention"
        },
        {
          "id": 227,
          "title": "How I Think About Freedom"
        },
        {
          "id": 228,
          "title": "How I Think About Meaning"
        },
        {
          "id": 229,
          "title": "How I Think About Legacy"
        },
        {
          "id": 230,
          "title": "How I Think About Reinvention"
        }
      ]
    }
  ],
  "starterPack": [
    {
      "id": 1,
      "title": "The Future I’m Building",
      "categoryId": 1,
      "categorySlug": "building-creating",
      "categoryName": "Building & Creating",
      "communicates": "Vision"
    },
    {
      "id": 10,
      "title": "What I’m Learning While Building",
      "categoryId": 1,
      "categorySlug": "building-creating",
      "categoryName": "Building & Creating",
      "communicates": "Intellectual curiosity"
    },
    {
      "id": 24,
      "title": "What Changed My Mind",
      "categoryId": 2,
      "categorySlug": "lessons-learning",
      "categoryName": "Lessons & Learning",
      "communicates": "Intellectual honesty"
    },
    {
      "id": 82,
      "title": "Things I See Differently",
      "categoryId": 5,
      "categorySlug": "contrarian-pov",
      "categoryName": "Contrarian / Point of View",
      "communicates": "Point of view"
    },
    {
      "id": 12,
      "title": "The Work Nobody Sees",
      "categoryId": 1,
      "categorySlug": "building-creating",
      "categoryName": "Building & Creating",
      "communicates": "Authenticity"
    },
    {
      "id": 28,
      "title": "What Failure Taught Me",
      "categoryId": 2,
      "categorySlug": "lessons-learning",
      "categoryName": "Lessons & Learning",
      "communicates": "Experience"
    },
    {
      "id": 41,
      "title": "The Principles I Follow",
      "categoryId": 3,
      "categorySlug": "principles-philosophy",
      "categoryName": "Principles & Philosophy",
      "communicates": "Philosophy"
    },
    {
      "id": 75,
      "title": "Things I’m Unlearning",
      "categoryId": 4,
      "categorySlug": "failure-change-growth",
      "categoryName": "Failure, Change & Growth",
      "communicates": "Growth"
    },
    {
      "id": 160,
      "title": "What I’m Saying No To",
      "categoryId": 9,
      "categorySlug": "life-personal-evolution",
      "categoryName": "Life & Personal Evolution",
      "communicates": "Discipline"
    },
    {
      "id": 5,
      "title": "What I’m Betting On",
      "categoryId": 1,
      "categorySlug": "building-creating",
      "categoryName": "Building & Creating",
      "communicates": "Conviction"
    },
    {
      "id": 122,
      "title": "The Question I Can’t Stop Thinking About",
      "categoryId": 7,
      "categorySlug": "curiosity-thinking",
      "categoryName": "Curiosity & Thinking",
      "communicates": "Curiosity"
    },
    {
      "id": 64,
      "title": "What I Would Do Differently",
      "categoryId": 4,
      "categorySlug": "failure-change-growth",
      "categoryName": "Failure, Change & Growth",
      "communicates": "Wisdom"
    },
    {
      "id": 81,
      "title": "Unpopular Business Opinion",
      "categoryId": 5,
      "categorySlug": "contrarian-pov",
      "categoryName": "Contrarian / Point of View",
      "communicates": "Contrarian thinking"
    },
    {
      "id": 141,
      "title": "What People Have Taught Me",
      "categoryId": 8,
      "categorySlug": "people-relationships",
      "categoryName": "People & Relationships",
      "communicates": "Humility"
    },
    {
      "id": 170,
      "title": "The Life I’m Designing",
      "categoryId": 9,
      "categorySlug": "life-personal-evolution",
      "categoryName": "Life & Personal Evolution",
      "communicates": "Personal philosophy"
    }
  ]
}

```

### Appendix B — data/reels.json (100 reel ideas, 3 pillars)

Library type: reel_idea. Weekly rotation source. Dopami / Done Together specific.

```json
{
  "title": "100 Reel Ideas",
  "eyebrow": "Dopami · Done Together",
  "subtitle": "Short-form content that makes people feel seen, gives them a tiny win, and invites them in.",
  "howToUse": [
    {
      "label": "Posting mix",
      "text": "Roughly 3 Seen : 2 Helped : 1 Belong each week. Seen reels grow reach, Helped reels earn saves, Belong reels convert followers into session attendees."
    },
    {
      "label": "Hook rule",
      "text": "The first line is on screen within 1.5 seconds. In Pillar 1, never say 'ADHD' in the hook; describe the moment instead. The word can appear in the caption."
    },
    {
      "label": "Help rule",
      "text": "In Pillar 2, the viewer must be able to complete the win without leaving the app. The CTA is 'save this', not 'download'."
    },
    {
      "label": "Consent rule",
      "text": "Pillar 3 uses real members only with written permission; blur or crop session grids otherwise."
    },
    {
      "label": "CTA ladder",
      "text": "Seen → comment 'me'. Helped → save. Belong → link in bio to tomorrow's session. Keep one CTA per reel."
    },
    {
      "label": "Series it",
      "text": "Recurring formats (e.g. 'Why you...' on Mondays, 'Start button' on Wednesdays, 'Tomorrow, 9am' as the standard end card) train the audience to come back."
    }
  ],
  "starterSequence": [
    "Week 1: #1, #40, #41, #76",
    "Week 2: #8, #24, #52, #83",
    "Week 3: #28 (money angle), #73 (replayable start button)",
    "Week 4: repeat the two best performers in a new format, and post #98 (why we don't do streaks)."
  ],
  "pillars": [
    {
      "id": 1,
      "name": "Seen",
      "range": "#1–40",
      "blurb": "Storytelling that names the experience. Goal: recognition and shares.",
      "ideas": [
        {
          "num": 1,
          "title": "Why you clean the whole kitchen instead of sending one email",
          "description": "Split screen: spotless kitchen vs. an untouched email draft. VO: the email isn't hard, it's undefined. Your brain picks the task with a clear finish line.",
          "format": "VO over B-roll",
          "duration": "20s"
        },
        {
          "num": 2,
          "title": "You're not lazy. You're waiting for the task to feel possible.",
          "description": "Talking head describing task paralysis as a wall you can see through but can't walk through. Not a choice, a wall.",
          "format": "Talking head",
          "duration": "25s"
        },
        {
          "num": 3,
          "title": "The 3 hours before an appointment where you can't do anything else",
          "description": "POV skit: clock ticking, person frozen on the couch, 'I'll just wait.' Names 'waiting mode' without naming anything clinical.",
          "format": "POV skit",
          "duration": "15s"
        },
        {
          "num": 4,
          "title": "When 'just reply to one text' becomes a 9-day project",
          "description": "WhatsApp unread counter climbs day by day. The guilt makes the reply heavier, which makes it later, which makes the guilt heavier.",
          "format": "Screen recording + text",
          "duration": "15s"
        },
        {
          "num": 5,
          "title": "Why you do your best work at 11pm the night before",
          "description": "The deadline lends you the urgency your brain can't generate on its own. Borrowed fuel, not bad character.",
          "format": "Talking head",
          "duration": "25s"
        },
        {
          "num": 6,
          "title": "You have 47 tabs open because closing one feels like losing it",
          "description": "Slow pan across a browser full of tabs. If it's out of sight, it's gone. Tabs are your external memory.",
          "format": "Screen recording",
          "duration": "15s"
        },
        {
          "num": 7,
          "title": "The 'I'll start after this video' loop",
          "description": "Autoplay screen recording, clock in the corner jumping 10 min, 30 min, 1 hr. End card: 'Sound familiar?'",
          "format": "Screen recording",
          "duration": "12s"
        },
        {
          "num": 8,
          "title": "Why you can play a game for 6 hours but can't do taxes for 6 minutes",
          "description": "Interest runs your engine, importance doesn't. Explains the interest-based attention idea in plain words.",
          "format": "Talking head",
          "duration": "30s"
        },
        {
          "num": 9,
          "title": "Buying a new planner is the most productive you'll feel all month",
          "description": "Pan across a shelf of barely-used planners. Newness feels like progress; it wears off by week two.",
          "format": "B-roll + VO",
          "duration": "15s"
        },
        {
          "num": 10,
          "title": "When someone says 'just make a to-do list'",
          "description": "Reaction skit: unroll a list of 43 items, all marked urgent. The list isn't the problem, choosing is.",
          "format": "Reaction skit",
          "duration": "12s"
        },
        {
          "num": 11,
          "title": "The shower argument you win every single time",
          "description": "Creator rehearsing a conversation in the shower. The mind runs its own playlist, all day.",
          "format": "POV skit",
          "duration": "15s"
        },
        {
          "num": 12,
          "title": "You didn't forget their birthday. You remembered it at 2am, three days early, and never again.",
          "description": "Text-on-screen timeline of the thought appearing once and vanishing. Memory that doesn't hold on to things you care about.",
          "format": "Text-led",
          "duration": "12s"
        },
        {
          "num": 13,
          "title": "Why a 5-minute task sits on your list for 5 weeks",
          "description": "Small tasks have no urgency, so they never win the fight for attention. They just quietly pile up.",
          "format": "Talking head",
          "duration": "20s"
        },
        {
          "num": 14,
          "title": "The chair pile isn't mess. It's a to-do list you can see.",
          "description": "Close-up of the clothes chair. Reframe: you keep things visible because hidden things stop existing.",
          "format": "B-roll + VO",
          "duration": "15s"
        },
        {
          "num": 15,
          "title": "Leaving the house: keys, phone, wallet, back for keys, back for charger",
          "description": "Door-exit skit looped four times, each time returning for one more thing.",
          "format": "Loop skit",
          "duration": "12s"
        },
        {
          "num": 16,
          "title": "You're 20 minutes early or 20 minutes late. Never on time.",
          "description": "Two-panel skit. Time doesn't feel like a line; it's 'now' and 'not now'.",
          "format": "Split skit",
          "duration": "15s"
        },
        {
          "num": 17,
          "title": "When your manager says 'quick call?' and your body goes cold",
          "description": "Slack notification, heart-rate rising text, spiralling thoughts. Names the dread of assumed criticism.",
          "format": "POV skit",
          "duration": "15s"
        },
        {
          "num": 18,
          "title": "Why you start five new hobbies every year",
          "description": "Montage of guitar, pottery, coding, running shoes. Not flaky: your brain loves the learning curve.",
          "format": "Montage + VO",
          "duration": "20s"
        },
        {
          "num": 19,
          "title": "The dishes aren't the problem. Starting the dishes is the problem.",
          "description": "Static shot of a sink; creator stares for 20 seconds, then text: 'the hardest part is the first plate.'",
          "format": "Static + text",
          "duration": "20s"
        },
        {
          "num": 20,
          "title": "You rehearse the phone call 11 times and still don't make it",
          "description": "Tally marks on a notepad for each rehearsal. Phone stays face-down.",
          "format": "POV skit",
          "duration": "15s"
        },
        {
          "num": 21,
          "title": "Sunday, 7pm: the dread arrives on schedule",
          "description": "Clock hits 7, lighting goes dim, the whole week lands at once as one blob.",
          "format": "Mood skit",
          "duration": "12s"
        },
        {
          "num": 22,
          "title": "Your brain in a Monday stand-up",
          "description": "Inner monologue captions: listening, listening, lunch thoughts, 'sorry, can you repeat that?'",
          "format": "Captioned skit",
          "duration": "15s"
        },
        {
          "num": 23,
          "title": "Being told you have 'so much potential' for 20 years",
          "description": "Quiet talking head. How a compliment turns into a weight. Emotional, no fixes offered.",
          "format": "Talking head",
          "duration": "30s"
        },
        {
          "num": 24,
          "title": "Why you're exhausted after doing 'nothing' all day",
          "description": "Avoiding a task takes effort. Fighting yourself for 8 hours burns more energy than doing the thing.",
          "format": "Talking head",
          "duration": "25s"
        },
        {
          "num": 25,
          "title": "The gym membership, the gym clothes, and a gym that has never seen you",
          "description": "Light comedy flat-lay of new gear with tags still on. Ends kind, not mocking.",
          "format": "Flat-lay + VO",
          "duration": "12s"
        },
        {
          "num": 26,
          "title": "When you finally sit down to work and suddenly need water, a snack, a playlist and a clean desk",
          "description": "Speed-ramped setup spiral. 40 minutes later, still no work.",
          "format": "Speed-ramp skit",
          "duration": "15s"
        },
        {
          "num": 27,
          "title": "Why you can't watch a movie without your phone",
          "description": "Too little stimulation feels uncomfortable, so the brain adds a second screen. Not rudeness.",
          "format": "Talking head",
          "duration": "20s"
        },
        {
          "num": 28,
          "title": "You're not bad with money. You're bad with boring admin that costs money.",
          "description": "Stack of late fees, forgotten subscriptions, unclaimed refunds. The hidden tax of 'I'll do it later'.",
          "format": "Text + B-roll",
          "duration": "20s"
        },
        {
          "num": 29,
          "title": "Diwali cleaning: you found your 2019 notebook and read it for two hours",
          "description": "India-specific skit. Cleaning becomes a side quest; the room stays half-done.",
          "format": "POV skit",
          "duration": "15s"
        },
        {
          "num": 30,
          "title": "When a task has 3 steps and you can't see step 1",
          "description": "'Plan the trip' shown as a fogged-out screen. The first action is invisible, so nothing starts.",
          "format": "Visual metaphor",
          "duration": "15s"
        },
        {
          "num": 31,
          "title": "The guilt of resting when you haven't 'earned' it, and you never feel like you've earned it",
          "description": "Couch shot, captions of the inner critic. Gentle ending line: rest isn't a reward.",
          "format": "Captioned mood",
          "duration": "20s"
        },
        {
          "num": 32,
          "title": "Why you over-promise on Monday and disappear by Thursday",
          "description": "Monday-you signs up for everything; Thursday-you inherits the bill. Optimism about your future self.",
          "format": "Two-character skit",
          "duration": "20s"
        },
        {
          "num": 33,
          "title": "You'll hit anyone else's deadline and none of your own",
          "description": "Split screen: boss's task done in an hour; personal project untouched for a year. Outside pressure works.",
          "format": "Split screen",
          "duration": "15s"
        },
        {
          "num": 34,
          "title": "When the task matters so much you can't touch it",
          "description": "The job application that's been 'almost ready' for three weeks. Importance turns into paralysis.",
          "format": "Talking head",
          "duration": "20s"
        },
        {
          "num": 35,
          "title": "Unread emails: 4,382. Anxiety: yes.",
          "description": "Inbox zoom-in, heartbeat sound design. Ends with 'you're not the only one.'",
          "format": "Screen + sound",
          "duration": "10s"
        },
        {
          "num": 36,
          "title": "Why the 30 minutes between tasks wreck your day",
          "description": "Switching gears costs more than the task itself. The 'in-between' where nothing happens.",
          "format": "Talking head",
          "duration": "20s"
        },
        {
          "num": 37,
          "title": "You remember every friend's problems and forget your own dentist appointment",
          "description": "Warm skit. Caring is easy; remembering your own admin isn't.",
          "format": "POV skit",
          "duration": "15s"
        },
        {
          "num": 38,
          "title": "'Padhai mein dhyan do' / 'just be more disciplined'",
          "description": "Hinglish skit with a parent. Validates the kid who was trying the whole time.",
          "format": "Hinglish skit",
          "duration": "20s"
        },
        {
          "num": 39,
          "title": "When your brain finally switches on, and you have 40 minutes before it switches off",
          "description": "Lights-on moment, frantic typing, then fade. Names the unpredictable focus window.",
          "format": "Mood skit",
          "duration": "15s"
        },
        {
          "num": 40,
          "title": "It's not that you don't care. It's that caring doesn't turn into doing.",
          "description": "Signature closer. Slow talking head, one line, long pause. Series anchor for the pillar.",
          "format": "Talking head",
          "duration": "15s"
        }
      ],
      "slug": "seen",
      "goal": "Recognition and shares"
    },
    {
      "id": 2,
      "name": "Helped",
      "range": "#41–75",
      "blurb": "Free, instant, tiny help. Goal: a felt win and saves.",
      "ideas": [
        {
          "num": 41,
          "title": "Can't start? Do the first 2 minutes with me. Timer starts now.",
          "description": "On-screen 2:00 countdown; creator starts their own task alongside. The reel itself is the tool.",
          "format": "Do-along timer",
          "duration": "2 min"
        },
        {
          "num": 42,
          "title": "Brain dump in 60 seconds",
          "description": "Write everything in your head. Circle three. Ignore the rest for today. Creator does it live on paper.",
          "format": "Live demo",
          "duration": "60s"
        },
        {
          "num": 43,
          "title": "The ugly first draft trick",
          "description": "Write the email badly on purpose. Show a terrible draft becoming a decent one in 30 seconds.",
          "format": "Screen demo",
          "duration": "30s"
        },
        {
          "num": 44,
          "title": "Make step one so small it's embarrassing",
          "description": "'Open laptop' is a valid step one. Show a real task broken into ridiculous micro-steps.",
          "format": "Text demo",
          "duration": "20s"
        },
        {
          "num": 45,
          "title": "Stuck? Say the next physical action out loud",
          "description": "'Work on report' becomes 'open the doc called Report'. Verbs your hands can do.",
          "format": "Talking head",
          "duration": "20s"
        },
        {
          "num": 46,
          "title": "The launch pad: one spot by the door",
          "description": "Tray for keys, wallet, phone, earphones. Set it up in 20 seconds on camera.",
          "format": "Setup demo",
          "duration": "20s"
        },
        {
          "num": 47,
          "title": "Five minutes, then you're allowed to stop",
          "description": "Permission to quit lowers the wall to start. Most people keep going.",
          "format": "Talking head + timer",
          "duration": "25s"
        },
        {
          "num": 48,
          "title": "Pair the boring task with a treat",
          "description": "That podcast only plays while you do dishes. Show the rule in action.",
          "format": "B-roll + VO",
          "duration": "20s"
        },
        {
          "num": 49,
          "title": "Double your time estimate. Then add 10 minutes.",
          "description": "Walk through one real estimate: 'shower 10 min' is actually 25. Plan with the real number.",
          "format": "Text demo",
          "duration": "20s"
        },
        {
          "num": 50,
          "title": "Name your alarms with the consequence",
          "description": "'LEAVE NOW or you miss the metro' beats a silent 8:15. Screen-record setting one up.",
          "format": "Screen demo",
          "duration": "15s"
        },
        {
          "num": 51,
          "title": "Under two minutes? Do it while this reel plays",
          "description": "Countdown overlay; viewer clears one tiny thing before the reel loops.",
          "format": "Do-along",
          "duration": "60s"
        },
        {
          "num": 52,
          "title": "Work with me for 60 seconds",
          "description": "Phone propped on a desk, creator working silently, ambient sound, timer. The smallest body double.",
          "format": "Silent co-work",
          "duration": "60s"
        },
        {
          "num": 53,
          "title": "Tomorrow's first task on a sticky note, tonight",
          "description": "Stick it on your laptop lid. Morning-you doesn't have to decide anything.",
          "format": "Demo",
          "duration": "15s"
        },
        {
          "num": 54,
          "title": "Make time visible",
          "description": "Analog clock or a visual timer on the desk. Time you can see is time you can feel.",
          "format": "Demo",
          "duration": "15s"
        },
        {
          "num": 55,
          "title": "Overwhelmed? Sort into today / this week / someday",
          "description": "45-second live sort of a messy list. Most items land in 'someday', and that's the relief.",
          "format": "Live demo",
          "duration": "45s"
        },
        {
          "num": 56,
          "title": "Can't pick what's first? Choose what makes tomorrow easiest",
          "description": "A single decision rule for when everything feels equal.",
          "format": "Talking head",
          "duration": "20s"
        },
        {
          "num": 57,
          "title": "The Reset 10",
          "description": "Ten-minute timer, one room, go. Speed-ramped before/after.",
          "format": "Speed-ramp",
          "duration": "20s"
        },
        {
          "num": 58,
          "title": "Put the thing you'll forget where you'll trip over it",
          "description": "Bill on the kettle, parcel on the doormat, charger on the pillow. Visibility beats memory.",
          "format": "Montage",
          "duration": "15s"
        },
        {
          "num": 59,
          "title": "One text for instant accountability",
          "description": "'Starting X now, check on me at 4.' Show sending it to a friend.",
          "format": "Screen demo",
          "duration": "15s"
        },
        {
          "num": 60,
          "title": "60-second reset when everything feels like too much",
          "description": "Guided breath: breathe out longer than you breathe in. Creator does it with the viewer.",
          "format": "Guided",
          "duration": "60s"
        },
        {
          "num": 61,
          "title": "Stalled? Change chairs.",
          "description": "New spot, new start. Show someone move from bed to kitchen table and begin.",
          "format": "B-roll + VO",
          "duration": "15s"
        },
        {
          "num": 62,
          "title": "Tonight, write a done list instead of a to-do list",
          "description": "Evidence you did things. Creator writes theirs on camera, including the tiny ones.",
          "format": "Demo",
          "duration": "25s"
        },
        {
          "num": 63,
          "title": "Leave a breadcrumb when you stop",
          "description": "Sticky note: 'next I was going to...'. Future-you restarts in seconds.",
          "format": "Demo",
          "duration": "15s"
        },
        {
          "num": 64,
          "title": "The three-alarm morning",
          "description": "Wake. Move. Leave. Three labelled alarms, nothing else to decide.",
          "format": "Screen demo",
          "duration": "20s"
        },
        {
          "num": 65,
          "title": "Pick one 'we're starting' song",
          "description": "Headphones on, same song every time. A ritual your brain learns as the start signal.",
          "format": "Mood demo",
          "duration": "20s"
        },
        {
          "num": 66,
          "title": "Turn the task into verbs",
          "description": "'Plan the trip' becomes five verbs: check dates, message group, compare trains, book, share. Tap-along text.",
          "format": "Text demo",
          "duration": "25s"
        },
        {
          "num": 67,
          "title": "Unsubscribe from five emails while I count",
          "description": "Countdown do-along. Tiny, visible win in under a minute.",
          "format": "Do-along",
          "duration": "45s"
        },
        {
          "num": 68,
          "title": "Decide what 'done' looks like before you start",
          "description": "The good-enough line stops a 20-minute task becoming a 3-hour polish.",
          "format": "Talking head",
          "duration": "20s"
        },
        {
          "num": 69,
          "title": "Phone in another room for 25 minutes. That's the reel.",
          "description": "Creator walks the phone away; text-only reel with a 25-minute suggestion.",
          "format": "Minimal",
          "duration": "10s"
        },
        {
          "num": 70,
          "title": "Stop mid-sentence when you end work",
          "description": "Tomorrow's start becomes obvious. Show the half-sentence left on screen.",
          "format": "Demo",
          "duration": "15s"
        },
        {
          "num": 71,
          "title": "Brain too loud to sleep? Two-minute worry park",
          "description": "Dump every loop on paper, close the notebook, lights off.",
          "format": "Guided",
          "duration": "2 min"
        },
        {
          "num": 72,
          "title": "Batch the boring",
          "description": "All calls on Tuesday at 11. One block, one dread, then done.",
          "format": "Talking head",
          "duration": "20s"
        },
        {
          "num": 73,
          "title": "Save this reel. It's your start button.",
          "description": "A 60-second countdown with a calm voice: 'pick one thing, we're starting.' Built to be replayed.",
          "format": "Replayable tool",
          "duration": "60s"
        },
        {
          "num": 74,
          "title": "The 5-4-3-2-1 stand-up",
          "description": "Count down out loud and stand before your brain argues. Demo from couch to desk.",
          "format": "Demo",
          "duration": "15s"
        },
        {
          "num": 75,
          "title": "Comment the one thing you're avoiding. Then go do two minutes of it.",
          "description": "Engagement reel that doubles as accountability. Creator replies to comments the next day.",
          "format": "Prompt reel",
          "duration": "15s"
        }
      ],
      "slug": "helped",
      "goal": "A felt win and saves"
    },
    {
      "id": 3,
      "name": "Belong",
      "range": "#76–100",
      "blurb": "Human connection with zero performance pressure. Goal: first session, then return.",
      "ideas": [
        {
          "num": 76,
          "title": "9am. 40 strangers. Cameras optional. Everyone just starts.",
          "description": "Timelapse of a live Done Together session grid. No talking, just work.",
          "format": "Session timelapse",
          "duration": "15s"
        },
        {
          "num": 77,
          "title": "Nobody checks your work here",
          "description": "You say what you'll do, then you do it. That's the whole deal. Host voiceover over session footage.",
          "format": "VO + session",
          "duration": "20s"
        },
        {
          "num": 78,
          "title": "I didn't finish my task. Nobody cared. I came back the next day.",
          "description": "Member story (with consent). The point is returning, not completing.",
          "format": "Member story",
          "duration": "30s"
        },
        {
          "num": 79,
          "title": "What a body doubling session actually looks like",
          "description": "Walkthrough: join, one-line intro, mics off, timer, quick share at the end.",
          "format": "Explainer",
          "duration": "30s"
        },
        {
          "num": 80,
          "title": "'I filed my taxes in a room full of people I've never met'",
          "description": "Member testimonial. The task they avoided for months, done in 50 minutes with company.",
          "format": "Testimonial",
          "duration": "25s"
        },
        {
          "num": 81,
          "title": "Your only job: show up. Not be productive. Show up.",
          "description": "Short manifesto-style reel. Sets the zero-pressure promise.",
          "format": "Text manifesto",
          "duration": "12s"
        },
        {
          "num": 82,
          "title": "The 30-second check-in",
          "description": "Say one thing you're working on. That's it. Montage of quick, low-stakes intros.",
          "format": "Montage",
          "duration": "20s"
        },
        {
          "num": 83,
          "title": "Missed a week? Welcome back. No streak. No shame.",
          "description": "Directly speaks to the comeback moment. Warm host greeting.",
          "format": "Talking head",
          "duration": "15s"
        },
        {
          "num": 84,
          "title": "Why working next to strangers works when working alone doesn't",
          "description": "Simple science: other people's presence nudges your brain into gear. No jargon.",
          "format": "Explainer",
          "duration": "30s"
        },
        {
          "num": 85,
          "title": "POV: your first body doubling session",
          "description": "Nervous join, expecting judgment. Everyone is just quietly working. Relief.",
          "format": "POV skit",
          "duration": "20s"
        },
        {
          "num": 86,
          "title": "Meet the 9am regulars",
          "description": "Mini-profiles: 'I'm Riya, I show up to write.' Identity, not performance.",
          "format": "Profile series",
          "duration": "20s"
        },
        {
          "num": 87,
          "title": "'I wrote two lines.'",
          "description": "End-of-session chat where tiny wins get celebrated like big ones.",
          "format": "Screen recording",
          "duration": "12s"
        },
        {
          "num": 88,
          "title": "The 11pm night-owl crew",
          "description": "A session for people whose brains switch on late. Your rhythm is welcome.",
          "format": "Session B-roll",
          "duration": "15s"
        },
        {
          "num": 89,
          "title": "What people worked on today",
          "description": "Scrolling anonymised list: 'cleaned one drawer', 'answered 3 emails', 'finally booked the doctor'. Small is normal.",
          "format": "Text scroll",
          "duration": "15s"
        },
        {
          "num": 90,
          "title": "You don't have to talk",
          "description": "Some days, camera off and just being there is the win.",
          "format": "Talking head",
          "duration": "15s"
        },
        {
          "num": 91,
          "title": "Host confession: I didn't want to start today either",
          "description": "The host is human too. Shared struggle lowers the bar to join.",
          "format": "Talking head",
          "duration": "20s"
        },
        {
          "num": 92,
          "title": "Work with me for 25 minutes",
          "description": "Full-length ambient co-working reel with timer. Replayable body double for anyone, anytime.",
          "format": "Long co-work",
          "duration": "25 min"
        },
        {
          "num": 93,
          "title": "'Why do you need strangers to do the dishes?'",
          "description": "Answering a partner or parent's question kindly. Useful for proxy audiences too.",
          "format": "Two-person skit",
          "duration": "25s"
        },
        {
          "num": 94,
          "title": "Day 1 camera off. Day 12 said hi. Day 30 hosting.",
          "description": "One member's journey told in three frames. Belonging grows slowly.",
          "format": "Timeline story",
          "duration": "20s"
        },
        {
          "num": 95,
          "title": "The 'I showed up' wall",
          "description": "Collage of first names / avatars (with consent) who attended this week. Showing up is the achievement.",
          "format": "Collage",
          "duration": "12s"
        },
        {
          "num": 96,
          "title": "Exam season study-along",
          "description": "CA, UPSC, board exam students studying together. India-specific session promo.",
          "format": "Session promo",
          "duration": "20s"
        },
        {
          "num": 97,
          "title": "Friday wind-down: close loops together",
          "description": "No new tasks. Just finish small things with others before the weekend.",
          "format": "Session promo",
          "duration": "15s"
        },
        {
          "num": 98,
          "title": "Why we don't do streaks",
          "description": "Founder talking head on the brand philosophy: coming back after a gap should feel good, not guilty.",
          "format": "Founder POV",
          "duration": "30s"
        },
        {
          "num": 99,
          "title": "Tag the friend who also 'can't start'",
          "description": "Bring a buddy. Two people who struggle, starting together.",
          "format": "Share prompt",
          "duration": "12s"
        },
        {
          "num": 100,
          "title": "Tomorrow, 9am. Bring whatever you're avoiding.",
          "description": "Standing invitation. Use as the recurring end card for the whole series.",
          "format": "Invite",
          "duration": "10s"
        }
      ],
      "slug": "belong",
      "goal": "First session, then return"
    }
  ]
}

```

### Appendix C — data/broll.json (104 B-roll shots, 8 categories, filming order, privacy checklist, 20 tips)

Library type: broll_shot. Partly Dopami-specific (team names, Dopami UI, Delhi-NCR).

```json
{
  "title": "B-Roll Shot List",
  "eyebrow": "Dopami · Founder Film",
  "subtitle": "One consolidated list. Duplicates merged. Shot names you can call on set.",
  "howToUse": "Pick 8–12 shots per film, not the whole menu. Prefer real Dopami UI, real teammates, and real rooms. Crop every screen so Slack, WhatsApp, dashboards, and documents are unreadable. Never film handheld while driving.",
  "categories": [
    {
      "id": 1,
      "title": "Deep work & focus",
      "blurb": "Use these to show you entering flow — the visual language of building, not posing.",
      "shots": [
        {
          "num": "1",
          "shot": "Walk-in to workspace",
          "frame": "Camera behind you. Laptop or bag in hand as you enter and sit.",
          "why": "Establishing beat. Opens a day-in-the-life sequence."
        },
        {
          "num": "2",
          "shot": "Laptop wake",
          "frame": "Close-up of hands opening the lid; screen lights up.",
          "why": "Simple start-of-session cue."
        },
        {
          "num": "3",
          "shot": "Headphones on",
          "frame": "Side profile, tight on ear. Slip on over-ears; cut ambient sound on the snap.",
          "why": "Universal shorthand for “flow state starts now.”"
        },
        {
          "num": "4",
          "shot": "Keyboard macro",
          "frame": "60fps tight shot, shallow DOF. Fingers on keys; rack focus keycaps → wrist.",
          "why": "Tactile motion that carries sound design."
        },
        {
          "num": "5",
          "shot": "Trackpad scroll",
          "frame": "45° behind the hand. Fast two-finger scroll through a board, backlog, or Figma canvas.",
          "why": "Shows scale and volume in half a second."
        },
        {
          "num": "6",
          "shot": "Screen in the eye",
          "frame": "Extreme close-up of eye or glasses in a dim room. Screen colors shift across the surface.",
          "why": "Signals intense analysis without leaking private data."
        },
        {
          "num": "7",
          "shot": "Desk rise",
          "frame": "Low floor angle looking up. Sit-to-stand desk lifts as you step into frame.",
          "why": "Vertical movement that breaks talking-head fatigue."
        },
        {
          "num": "8",
          "shot": "Timer start",
          "frame": "Top-down. Flip a sand timer or tap start on a watch / focus app.",
          "why": "Puts stakes on the next scene."
        },
        {
          "num": "9",
          "shot": "Door-close boundary",
          "frame": "Inside looking out. Door pulled shut; latch clicks.",
          "why": "Visual for “distractions off.”"
        },
        {
          "num": "10",
          "shot": "Pen rule-out",
          "frame": "Overhead flat lay. Uncap a pen and cross off a finished line.",
          "why": "Satisfying closure; viewers pause to read."
        },
        {
          "num": "11",
          "shot": "Dual-monitor pace",
          "frame": "Slow track from behind the chair. Head turns between reference and live work.",
          "why": "Makes desktop work feel spatial, not static."
        },
        {
          "num": "12",
          "shot": "Breath reset",
          "frame": "Medium shot across the desk. Lean back, rub temple, exhale, dive back in.",
          "why": "Humanizes the grind between typing shots."
        }
      ]
    },
    {
      "id": 2,
      "title": "Product & design craft",
      "blurb": "Proof you are actually building. Prefer the real Dopami UI over generic mockups.",
      "shots": [
        {
          "num": "1",
          "shot": "Figma snap",
          "frame": "Macro on screen. Cursor drags a card or frame into perfect alignment.",
          "why": "Craft and precision. Speaks to designers."
        },
        {
          "num": "2",
          "shot": "Phone prototype",
          "frame": "Top-down 45°, phone on desk. Thumb runs through real screen transitions.",
          "why": "Makes the product tangible."
        },
        {
          "num": "3",
          "shot": "App on the move",
          "frame": "Testing Dopami on your phone while walking.",
          "why": "Product lives outside the studio."
        },
        {
          "num": "4",
          "shot": "Change + refresh",
          "frame": "Edit something, then watch the live UI update.",
          "why": "Shows iteration, not a finished demo."
        },
        {
          "num": "5",
          "shot": "Multi-device hand-off",
          "frame": "Pan across phone, tablet, laptop. Tap mobile; laptop state updates.",
          "why": "Signals product maturity."
        },
        {
          "num": "6",
          "shot": "Sketch → UI",
          "frame": "Hold a rough paper sketch next to the finished screen, or cut paper → wireframe → UI.",
          "why": "Zero-to-one story in one beat."
        },
        {
          "num": "7",
          "shot": "Stylus wireframe",
          "frame": "Over-shoulder on iPad. Boxes, circles, layout lines.",
          "why": "Early-stage creation energy."
        },
        {
          "num": "8",
          "shot": "Whiteboard flow",
          "frame": "60fps or time-lapse following a marker tip: journeys, arrows, architecture.",
          "why": "Anchors strategy voiceover."
        },
        {
          "num": "9",
          "shot": "Sticky-note move",
          "frame": "Peel a note from Backlog and slap it onto Shipped.",
          "why": "Software progress made physical."
        },
        {
          "num": "10",
          "shot": "Voice-note idea",
          "frame": "Record a product thought into the phone.",
          "why": "Capture-the-spark moment."
        },
        {
          "num": "11",
          "shot": "Dashboard from behind",
          "frame": "You facing a large screen of growth / retention charts. No private numbers readable.",
          "why": "Momentum without leaking data."
        },
        {
          "num": "12",
          "shot": "Finger traces the curve",
          "frame": "Rack focus onto a chart. Finger follows a line up and to the right.",
          "why": "Visual PMF / traction beat."
        },
        {
          "num": "13",
          "shot": "Bug pause",
          "frame": "Side angle. Mouse stops, head tilts, you lean 3 inches closer.",
          "why": "Real-time problem-solving tension."
        },
        {
          "num": "14",
          "shot": "Publish click",
          "frame": "Extreme close-up of the index finger on Submit / Deploy / Launch.",
          "why": "Climax shot for launch films."
        },
        {
          "num": "15",
          "shot": "Terminal deploy",
          "frame": "High-contrast crop. Hit Enter; build text cascades.",
          "why": "Codes you as close to the builders. Use only if true."
        }
      ]
    },
    {
      "id": 3,
      "title": "Thinking, research & the ADHD angle",
      "blurb": "Best for “what I believe / future I’m building / lessons” films. On-brand for Dopami.",
      "shots": [
        {
          "num": "1",
          "shot": "Walk and think",
          "frame": "Alone, no phone performance. Medium or behind.",
          "why": "Default cutaway for reflective VO."
        },
        {
          "num": "2",
          "shot": "Window + city",
          "frame": "Looking out; traffic or skyline below.",
          "why": "Scale + interior thought."
        },
        {
          "num": "3",
          "shot": "Café stare",
          "frame": "Laptop open, eyes off the screen.",
          "why": "Thinking is not the same as typing."
        },
        {
          "num": "4",
          "shot": "One sentence, pause",
          "frame": "Write a single line in a notebook and stop.",
          "why": "Ideation, not productivity theatre."
        },
        {
          "num": "5",
          "shot": "Old notebook flip",
          "frame": "Pages of earlier notes, diagrams, messy thinking.",
          "why": "Continuity of the work over time."
        },
        {
          "num": "6",
          "shot": "Highlight / underline",
          "frame": "Mark a sentence in a book, paper, or printout.",
          "why": "Research-in-progress texture."
        },
        {
          "num": "7",
          "shot": "Close the notebook",
          "frame": "Finish the thought, close the cover.",
          "why": "Natural scene ender."
        },
        {
          "num": "8",
          "shot": "Whiteboard before writing",
          "frame": "Stand still, look, then make the first mark.",
          "why": "Decision moment before the diagram."
        },
        {
          "num": "9",
          "shot": "ADHD papers on screen",
          "frame": "Close-up of studies or notes — no copyrighted page filling the frame.",
          "why": "Category proof for Dopami content."
        },
        {
          "num": "10",
          "shot": "Annotate a study",
          "frame": "Highlight / scribble on a printed paper.",
          "why": "Founder doing the homework."
        },
        {
          "num": "11",
          "shot": "Focus session in frame",
          "frame": "Timer running; you deep in work. Same family as Deep Work shots.",
          "why": "Product promise, lived."
        },
        {
          "num": "12",
          "shot": "Body-doubling call",
          "frame": "Done Together / community grid on screen, carefully framed.",
          "why": "Shows the actual mechanism, not a slogan."
        },
        {
          "num": "13",
          "shot": "User-quote wall",
          "frame": "Sticky notes of real (anonymized) feedback.",
          "why": "Users in the room without putting faces on camera."
        },
        {
          "num": "14",
          "shot": "Reminder pop",
          "frame": "Stylized notification on phone — dramatized, not a private message.",
          "why": "Executive-function motif."
        },
        {
          "num": "15",
          "shot": "Clutter → clear desk",
          "frame": "Split or match-cut: messy desk to reset desk.",
          "why": "Before/after of attention, not aesthetics."
        }
      ]
    },
    {
      "id": 4,
      "title": "Team, leadership & war room",
      "blurb": "Use real people and real rooms. Crop so Slack, WhatsApp, and dashboards never leak private text.",
      "shots": [
        {
          "num": "1",
          "shot": "You walk in",
          "frame": "Office door opens; you enter. Or wide of you arriving.",
          "why": "Founder-in-the-building beat."
        },
        {
          "num": "2",
          "shot": "Huddle around a table",
          "frame": "2–4 people, mid-discussion, not posed at camera.",
          "why": "Company, not personal brand cosplay."
        },
        {
          "num": "3",
          "shot": "Over one laptop",
          "frame": "Leaning in, pointing at a line or chart, reacting together.",
          "why": "Collaborative problem-solving."
        },
        {
          "num": "4",
          "shot": "Video-call mosaic",
          "frame": "Slow push-in on a grid. Speaking indicators moving. No readable chat.",
          "why": "Distributed team shorthand."
        },
        {
          "num": "5",
          "shot": "Call from behind the lid",
          "frame": "You on a team call; camera behind the laptop.",
          "why": "Safer than screen-facing shots."
        },
        {
          "num": "6",
          "shot": "Notes during a call",
          "frame": "Hand writing while the call runs off-camera or blurred.",
          "why": "Listening, not performing."
        },
        {
          "num": "7",
          "shot": "Walk-and-talk",
          "frame": "Reverse track ahead of two people debating a product call.",
          "why": "Keeps dialogue segments moving."
        },
        {
          "num": "8",
          "shot": "Whiteboard, many hands",
          "frame": "More than one person writing.",
          "why": "Shared thinking, not founder monologue."
        },
        {
          "num": "9",
          "shot": "Ankit at the screen",
          "frame": "Candid coding / building. No shoulder-tap posing.",
          "why": "CTO as a real person in the story."
        },
        {
          "num": "10",
          "shot": "Somalika with numbers",
          "frame": "Reviewing a sheet or model, mid-work.",
          "why": "Ops / numbers as part of the culture."
        },
        {
          "num": "11",
          "shot": "Someone presenting",
          "frame": "One person at the board or deck; others watching.",
          "why": "Internal gravity, not only founder-on-stage."
        },
        {
          "num": "12",
          "shot": "Marker idle",
          "frame": "You spin or tap a marker while listening to an engineer.",
          "why": "Listening-leader beat."
        },
        {
          "num": "13",
          "shot": "Fist bump / high five",
          "frame": "Handheld, slightly imperfect, over a desk after a blocker clears.",
          "why": "Micro-win. Don’t over-stage it."
        },
        {
          "num": "14",
          "shot": "Hard-stop gaze",
          "frame": "Profile, window side-light. Chin on hand, processing.",
          "why": "Cutaway for failure, pivot, hard calls."
        },
        {
          "num": "15",
          "shot": "Pitch-deck click",
          "frame": "Low side angle. Clicker press; slide changes in the background.",
          "why": "Fundraising / sales readiness."
        },
        {
          "num": "16",
          "shot": "Team lunch or chai",
          "frame": "Candid, not a brand campaign smile-hold.",
          "why": "Culture without the stock-photo feel."
        },
        {
          "num": "17",
          "shot": "Hallway / street walk",
          "frame": "Group walking mid-conversation.",
          "why": "Company in motion."
        }
      ]
    },
    {
      "id": 5,
      "title": "Daily routine, fitness & founder life",
      "blurb": "Lifestyle glue. Shoot once, reuse for months. Keep gym and commute honest — no costume discipline.",
      "shots": [
        {
          "num": "1",
          "shot": "Blind pull at dawn",
          "frame": "Silhouette. Blinds open; early light washes the room.",
          "why": "Before-the-day evidence."
        },
        {
          "num": "2",
          "shot": "Coffee / chai",
          "frame": "Macro, 60–120fps. Extraction, steam, pour. Or a simple kitchen make.",
          "why": "Sensory reset between narrative blocks."
        },
        {
          "num": "3",
          "shot": "Watch on",
          "frame": "Close-up of fastening a watch.",
          "why": "Small ritual; time motif."
        },
        {
          "num": "4",
          "shot": "Shoes / laces",
          "frame": "Floor-level. Tie, heel tap, stand out of frame.",
          "why": "Transition into outdoor or gym."
        },
        {
          "num": "5",
          "shot": "Grab laptop + keys + phone",
          "frame": "Hands collecting the kit on the way out.",
          "why": "Leaving-the-nest beat."
        },
        {
          "num": "6",
          "shot": "Bag sling",
          "frame": "Ground-level rear. Pack up, one-shoulder sling, walk out.",
          "why": "Clean office → transit cut."
        },
        {
          "num": "7",
          "shot": "Treadmill strike",
          "frame": "Low side track, level with the deck. Steady cadence.",
          "why": "Rhythm for uptempo tracks."
        },
        {
          "num": "8",
          "shot": "Plate load / chalk grip",
          "frame": "Sleeve clang, or hands wrapping knurled steel with chalk puff.",
          "why": "Grit. Only if this is actually your training."
        },
        {
          "num": "9",
          "shot": "Post-set breath",
          "frame": "Wide, backlit. Hands on knees or towel, chest working.",
          "why": "Unpolished counterweight to shiny product shots."
        },
        {
          "num": "10",
          "shot": "Protein / kitchen prep",
          "frame": "Top-down. Chop, crack eggs, assemble.",
          "why": "Habits as operations, not influencer meal-prep."
        },
        {
          "num": "11",
          "shot": "Pack for a trip",
          "frame": "Bag, charger, notebook going in.",
          "why": "Movement / travel chapter marker."
        }
      ]
    },
    {
      "id": 6,
      "title": "Human & emotional beats",
      "blurb": "These stop the film from looking like LinkedIn cosplay. Short. Unperformed. One or two per piece.",
      "shots": [
        {
          "num": "1",
          "shot": "Lean-back relief",
          "frame": "Tiny exhale after something works.",
          "why": "Win without a fist-pump."
        },
        {
          "num": "2",
          "shot": "Small smile at the screen",
          "frame": "Something shipped or a message landed. Keep it small.",
          "why": "Earns more than a staged laugh."
        },
        {
          "num": "3",
          "shot": "Good-news phone glance",
          "frame": "Look at the phone, then a real reaction.",
          "why": "Life leaking into work."
        },
        {
          "num": "4",
          "shot": "Forehead rub / laptop close",
          "frame": "Frustration, then stop.",
          "why": "The day is not only flow state."
        },
        {
          "num": "5",
          "shot": "Deep breath, start again",
          "frame": "Reset after the above.",
          "why": "Resilience without a speech."
        },
        {
          "num": "6",
          "shot": "Alone after a hard day",
          "frame": "Sit. Don’t act tired — just stop performing.",
          "why": "Weight. Use sparingly."
        },
        {
          "num": "7",
          "shot": "Off-air laugh",
          "frame": "The two seconds after a take when posture drops.",
          "why": "Humility. Best podcast B-roll you can steal."
        },
        {
          "num": "8",
          "shot": "Rain walk",
          "frame": "Umbrella optional. Don’t romanticize it into a perfume ad.",
          "why": "Mood + weather texture."
        },
        {
          "num": "9",
          "shot": "Sunset walk",
          "frame": "Same family as thinking walks, warmer light.",
          "why": "Close of day / hope beat."
        },
        {
          "num": "10",
          "shot": "Rooftop or high window",
          "frame": "You looking at the city, not the camera.",
          "why": "Scale. Good under “future I’m building.”"
        },
        {
          "num": "11",
          "shot": "Walk away into space",
          "frame": "You leave frame into a large environment.",
          "why": "Editorial end card."
        }
      ]
    },
    {
      "id": 7,
      "title": "Media, podcast & community",
      "blurb": "For talking-head, interview, and “I record this so you don’t have to” content.",
      "shots": [
        {
          "num": "1",
          "shot": "Mic arm in",
          "frame": "Wide. Articulated boom swings to your mouth.",
          "why": "Signals an insight or interview is coming."
        },
        {
          "num": "2",
          "shot": "Lens cap off (POV)",
          "frame": "First person, looking down at the rig. Cap twists off; room snaps sharp.",
          "why": "Immersive open."
        },
        {
          "num": "3",
          "shot": "Clap for sync",
          "frame": "60fps, centered. One sharp clap in front of the lens.",
          "why": "Audio-visual hook in the first 2 seconds."
        },
        {
          "num": "4",
          "shot": "Eyes on outline",
          "frame": "ECU of eyes tracking bullets, then into the lens.",
          "why": "Anticipation before the line."
        },
        {
          "num": "5",
          "shot": "Waveform slice",
          "frame": "Screen crop. Scrub dense vocals, snap a split.",
          "why": "Shows deliberate editing. Speaks to creators."
        },
        {
          "num": "6",
          "shot": "Studio time-lapse",
          "frame": "Wide corner, 8–16x. Lights up, tripod, cables, empty room filling.",
          "why": "Production effort, not magic."
        },
        {
          "num": "7",
          "shot": "Phone call, pacing",
          "frame": "Walking, gesturing, not looking at camera.",
          "why": "Founder-as-operator, not host."
        }
      ]
    },
    {
      "id": 8,
      "title": "Transitions, transit & texture",
      "blurb": "The connective tissue. Shoot a bank of these once; they cover cuts, location changes, and pacing.",
      "shots": [
        {
          "num": "1",
          "shot": "Elevator doors",
          "frame": "Centered, facing out. Doors open or seal to black.",
          "why": "Hard cut between two places."
        },
        {
          "num": "2",
          "shot": "Escalator / stairs up",
          "frame": "Low, symmetrical. You stand; camera rises into daylight.",
          "why": "Linear motion that holds edit energy."
        },
        {
          "num": "3",
          "shot": "Street walk",
          "frame": "Busy pavement, Delhi-NCR texture. You moving through, not posing.",
          "why": "Place. Don’t stock-replace it with generic downtown."
        },
        {
          "num": "4",
          "shot": "Car arrive / leave",
          "frame": "Get in, or walk away from the car after arriving. Driving only from a mounted / passenger camera — never handheld while driving.",
          "why": "Location change, safely."
        },
        {
          "num": "5",
          "shot": "Train / car glass",
          "frame": "Profile on your reflection; city streaking behind.",
          "why": "Best philosophical VO cutaway."
        },
        {
          "num": "6",
          "shot": "Golden-hour stride",
          "frame": "Low gimbal past glass buildings, long shadows.",
          "why": "Scale and polish. Don’t overuse."
        },
        {
          "num": "7",
          "shot": "Rain on the sill",
          "frame": "Steaming mug on a high-rise ledge. Rack focus drops → city.",
          "why": "Slows frantic pacing."
        },
        {
          "num": "8",
          "shot": "Steam by the laptop",
          "frame": "Coffee/chai steam in the same frame as the machine.",
          "why": "Warmth in a work scene."
        },
        {
          "num": "9",
          "shot": "Sun through window",
          "frame": "Dust in the beam. Slow.",
          "why": "Calm-founder atmosphere."
        },
        {
          "num": "10",
          "shot": "Plant / desk still",
          "frame": "One object, held.",
          "why": "Breathing room between faces."
        },
        {
          "num": "11",
          "shot": "Notebook in a fan / breeze",
          "frame": "Pages lift.",
          "why": "Light motion texture."
        },
        {
          "num": "12",
          "shot": "Hand to phone on desk",
          "frame": "Reach, lift, or lock.",
          "why": "Tiny action that covers a jump cut."
        },
        {
          "num": "13",
          "shot": "Watch or clock ECU",
          "frame": "Time as a motif, not a countdown gimmick.",
          "why": "Urgency without a caption."
        },
        {
          "num": "14",
          "shot": "Shoes on pavement",
          "frame": "Feet only, commute cadence.",
          "why": "Anonymous transit B-roll."
        },
        {
          "num": "15",
          "shot": "Wide workspace at open of day",
          "frame": "Empty or just-started desk. Establishing.",
          "why": "Where we are."
        },
        {
          "num": "16",
          "shot": "Lamp off",
          "frame": "Dark room, one warm lamp. Hand clicks it; room goes blue-black.",
          "why": "Definitive end-of-day shot."
        }
      ]
    }
  ],
  "filmingOrder": [
    "Home / morning first: blinds, coffee, watch, bag, laptop open. Natural light dies quickly.",
    "Desk block next: typing, headphones, timer, notebook, Figma, phone prototype, dashboards. Same shirt, same desk.",
    "Then team: huddles, Ankit, Somalika, whiteboard, chai. People are the scarce resource.",
    "Transit last: elevator, street, window, golden hour, lamp off. These are reusable across many films.",
    "Emotional beats are not a separate setup — grab them inside the desk and walk blocks when they actually happen."
  ],
  "privacyChecklist": [
    "Blur or crop every chat, email, customer name, and metric that is not meant to be public.",
    "Ask teammates before any face-forward shot. Candid is not the same as consented.",
    "Don’t put copyrighted paper or a full article page on screen.",
    "Driving shots: passenger seat or a mounted camera only."
  ],
  "tips": [
    "Pick 8–12 shots per film, not the whole menu.",
    "Prefer real Dopami UI, real teammates, and real rooms over stock or staged mockups.",
    "Crop every screen so Slack, WhatsApp, dashboards, and documents are unreadable.",
    "Never film handheld while driving — passenger seat or a mounted camera only.",
    "Shoot the keyboard macro at 60fps with a shallow depth of field — tactile motion that carries sound design.",
    "Ask teammates before any face-forward shot. Candid is not the same as consented.",
    "Don't put copyrighted paper or a full article page on screen.",
    "Blur or crop every chat, email, customer name, and metric that isn't meant to be public.",
    "Shoot home and morning scenes first — natural light dies quickly.",
    "Group desk-block shots together: typing, headphones, timer, notebook, Figma, phone prototype — same shirt, same desk.",
    "Save transit shots (elevator, street, window, golden hour, lamp off) for last — they're reusable across many films.",
    "Grab emotional beats inside the desk and walk blocks when they actually happen. Don't stage a separate setup for them.",
    "A small, real smile at the screen earns more than a staged laugh.",
    "Keep gym and commute shots honest — no costume discipline.",
    "One sharp clap in frame at 60fps gives you an audio-visual sync hook in the first two seconds.",
    "Time-lapse the whiteboard flow — it anchors strategy voiceover better than a static hold.",
    "Don't over-stage the fist bump — a slightly imperfect handheld take beats a posed one.",
    "Shoot a bank of transition shots once (elevators, escalators, doors) — they cover cuts and pacing across many future edits.",
    "Rack focus from a chart to a finger tracing the line — the clearest way to show traction without reading numbers.",
    "People are the scarce resource on shoot day — schedule team shots (huddles, whiteboard, chai) in one block."
  ]
}

```

### Appendix D1 — data/ads.json (39 ad formats, 6 categories)

Library type: ad_format. Generic playbook; the 'why' fields are the warning rules the claims checker builds on.

```json
{
  "title": "Ads",
  "eyebrow": "Dopami · Growth",
  "subtitle": "39 ad angles and formats, grouped by when to reach for them. Pick 6–8, not all 39.",
  "startHere": [
    "If you have almost no customers yet, lead with problem, contrast, and founder demo formats: 5, 6, 10, 12, 23, 27, 32, 35, 39.",
    "If you have even 5–10 real buyers, add proof wrappers: 28, 29, 34. Save review-site and urgency formats until the proof is real."
  ],
  "shipAdvice": "Ship 6–8 ads, not 39. Same angle, different wrapper. Kill anything that does not hold attention past 3 seconds.",
  "categories": [
    {
      "id": 1,
      "title": "News, urgency, and pattern breaks",
      "blurb": "Only as strong as the real event behind them. Don't invent news or scarcity — it trains people to ignore you.",
      "ads": [
        {
          "num": "1",
          "name": "Breaking news",
          "frame": "Lower-third or news-desk look: “New: [specific claim].” Early stage: founder at a desk, bold caption, one concrete fact.",
          "why": "Works when you have a real launch, a study, or a category shift. Do not invent a news event."
        },
        {
          "num": "9",
          "name": "Low-stock alert",
          "frame": "Red banner, units left, countdown.",
          "why": "Only if inventory is actually limited. Fake scarcity trains people to ignore you and can get the ad rejected."
        },
        {
          "num": "19",
          "name": "We're sorry",
          "frame": "Apology open: “Sorry we sold out” or “Sorry this took so long to launch.” Useful at restock or after a waitlist.",
          "why": "Needs a real event behind it."
        },
        {
          "num": "24",
          "name": "Warning",
          "frame": "Yellow/black label, “Warning: if you do X, this happens.” Good for a costly mistake your product prevents.",
          "why": "Keep the claim specific and supportable."
        },
        {
          "num": "33",
          "name": "Emergency",
          "frame": "“Case of emergency” checklist energy.",
          "why": "Best for acute problems (stain, deadline, outage, flare-up), weak for lifestyle brands."
        }
      ]
    },
    {
      "id": 2,
      "title": "Proof wrappers",
      "blurb": "Only pull real reviews, real screenshots, real customers. Thin or faked proof looks staged and costs trust.",
      "ads": [
        {
          "num": "2",
          "name": "Trustpilot reviews",
          "frame": "Stars and review cards on screen.",
          "why": "Only pull real reviews. Early brands usually do not have enough volume; a thin 4.9 from 3 reviews looks staged."
        },
        {
          "num": "13",
          "name": "Zero stars",
          "frame": "Opens on a 1-star complaint about the old way, then shows your fix.",
          "why": "The bad review is about the category or a competitor behavior, not a fake review of you."
        },
        {
          "num": "17",
          "name": "Reddit style",
          "frame": "Dark-mode post, title, upvotes, a comment thread. Write it in the subreddit's voice.",
          "why": "Do not fake a real thread. “Posted in r/ADHD” energy, original copy."
        },
        {
          "num": "28",
          "name": "Email screenshot",
          "frame": "Inbox mock with a subject line like “this actually worked.”",
          "why": "Use a real customer email with permission, or label it as a reconstruction."
        },
        {
          "num": "29",
          "name": "Text message",
          "frame": "iMessage bubbles: friend recommends the product.",
          "why": "Highest trust when it is a real screenshot. Scripted versions still work if the wording is messy, not ad-copy."
        },
        {
          "num": "34",
          "name": "Testimonial",
          "frame": "Face to camera, specific result, timeframe, and what failed before. One named customer beats a montage.",
          "why": "Early stage: offer the product free for an honest 20-second clip."
        }
      ]
    },
    {
      "id": 3,
      "title": "Interface mimics",
      "blurb": "Cheap to shoot, native to the feed. Best default wrapper for a brand nobody knows yet.",
      "ads": [
        {
          "num": "11",
          "name": "iPhone Notes",
          "frame": "Yellow notes app, a short list or confession typed out.",
          "why": "Cheap and native. Use for “what I stopped doing” or “3 things I wish I knew.”"
        },
        {
          "num": "14",
          "name": "Google search",
          "frame": "Search bar types the problem, results appear, your answer is the click.",
          "why": "Strong when people already search the pain (“why does my focus crash at 3pm”)."
        },
        {
          "num": "21",
          "name": "Instagram story",
          "frame": "Polls, question stickers, handwritten text, casual vertical.",
          "why": "Feels organic. Founder can shoot this in one take."
        },
        {
          "num": "31",
          "name": "Native",
          "frame": "Looks like a normal post in the feed: no logo open, no packshot in frame one, caption does the selling.",
          "why": "Best default for a new brand. The product enters after the hook."
        }
      ]
    },
    {
      "id": 4,
      "title": "Problem and contrast",
      "blurb": "The most reliable structures on this list. Name the real alternative, show the mess before the logo.",
      "ads": [
        {
          "num": "6",
          "name": "Us vs them",
          "frame": "Split screen: old habit vs your product.",
          "why": "Name the alternative people already use (another app, coffee, willpower), not a straw man."
        },
        {
          "num": "10",
          "name": "Myth vs fact",
          "frame": "Two lines. Myth in red, fact in plain type.",
          "why": "Good for a category full of bad advice. One myth per ad."
        },
        {
          "num": "16",
          "name": "Don't be an idiot",
          "frame": "Blunt callout of a common mistake.",
          "why": "Tone has to match the audience. Fine for builders and operators, wrong for anxious or clinical categories."
        },
        {
          "num": "23",
          "name": "Problem vs solution",
          "frame": "Left side is the mess, right side is the outcome, product is the bridge.",
          "why": "The most reliable structure on this list. Show the problem before the logo."
        },
        {
          "num": "26",
          "name": "You can avoid",
          "frame": "“You can avoid [cost] if you stop [behavior].”",
          "why": "Future-pace the pain, then one action."
        },
        {
          "num": "30",
          "name": "Problems",
          "frame": "Rapid list of pains, each crossed out or stacked. End on the one problem you actually solve.",
          "why": "Do not claim the whole list."
        },
        {
          "num": "36",
          "name": "Don't buy this",
          "frame": "Reverse psychology: “Don’t buy this if you already [have the outcome].”",
          "why": "Filters the wrong buyer and raises curiosity. Needs a real reason someone should not buy."
        },
        {
          "num": "39",
          "name": "New vs old",
          "frame": "Before/after of the method, not just the result.",
          "why": "“Old way: 4 apps and a spreadsheet. New way: one check-in.”"
        }
      ]
    },
    {
      "id": 5,
      "title": "Lists and education",
      "blurb": "Teach something real. A self-diagnosis hook or a true mechanism earns attention even from people who never buy.",
      "ads": [
        {
          "num": "20",
          "name": "Tier list",
          "frame": "S-to-F ranking of options in the category, your product placed with a reason.",
          "why": "Works once you can defend the ranking. Arrogant if you have no track record."
        },
        {
          "num": "22",
          "name": "X signs",
          "frame": "“5 signs your [system] is broken.” Self-diagnosis hook.",
          "why": "Viewer counts how many apply, then you offer the fix."
        },
        {
          "num": "27",
          "name": "Reasons why",
          "frame": "Numbered reasons, one per cut. Easy to shoot: founder, whiteboard, or text cards.",
          "why": "Lead with the least obvious reason."
        },
        {
          "num": "32",
          "name": "Hack 101",
          "frame": "One tactic, taught fast, product is the shortcut.",
          "why": "Best early-stage format if you have a real mechanism. Teach the trick even if they never buy."
        },
        {
          "num": "37",
          "name": "Stat headline",
          "frame": "One number, huge type: “73% of…”",
          "why": "Only use a number you can source. Invented stats get skipped and can fail review."
        }
      ]
    },
    {
      "id": 6,
      "title": "Production styles",
      "blurb": "Film founder versions of a proven script before paying for AI podcast or claymation versions of an unproven one.",
      "ads": [
        {
          "num": "3",
          "name": "Offer",
          "frame": "Price, bundle, or guarantee is the visual.",
          "why": "Useful after the angle is proven. Cold traffic rarely converts on a discount alone when the brand is unknown."
        },
        {
          "num": "4",
          "name": "Script",
          "frame": "Teleprompter-style read, full script on screen or burned-in captions, founder talking straight.",
          "why": "Write the hook in line one. Record 5 hooks, keep one body."
        },
        {
          "num": "5",
          "name": "Whiteboard",
          "frame": "Marker, arrows, before/after diagram.",
          "why": "High trust for anything with a mechanism (habit, finance, health, software). Phone on a tripod is enough."
        },
        {
          "num": "7",
          "name": "AI podcast",
          "frame": "Two hosts, waveform, “we tested this” conversation.",
          "why": "Pattern interrupt because it does not look like UGC. Keep claims ordinary — a fake expert with medical or financial claims is a review risk."
        },
        {
          "num": "8",
          "name": "Doodle",
          "frame": "Hand-drawn stick figures over a voiceover.",
          "why": "Good when the product is abstract. One idea, 15 seconds."
        },
        {
          "num": "12",
          "name": "Transformation",
          "frame": "Before state, turning point, after state.",
          "why": "For an early brand, transform the workflow or the week, not the person, unless you have consented footage."
        },
        {
          "num": "15",
          "name": "Bundle",
          "frame": "Everything they get, stacked visually, price anchor at the end.",
          "why": "Use when the offer is the advantage. Weak if the product is not understood yet."
        },
        {
          "num": "18",
          "name": "Side effect",
          "frame": "“Side effect of using this: [unexpected good outcome].”",
          "why": "Soft curiosity hook. The side effect has to be true."
        },
        {
          "num": "25",
          "name": "Claymation",
          "frame": "Stop-motion clay look, usually AI-generated. Use it to show a mechanism — the problem as a character, the product as the fix.",
          "why": "Stops the scroll because the feed is full of talking heads. Do not make the clay the strategy; put a proven script inside it."
        },
        {
          "num": "35",
          "name": "Greenscreen",
          "frame": "Person in front of a screenshot, article, or product UI, pointing.",
          "why": "Fastest way to add proof. Early stage: greenscreen your own app, a calendar, or a customer message."
        },
        {
          "num": "38",
          "name": "Meme",
          "frame": "Existing meme format, your punchline.",
          "why": "Good for organic and retargeting. Paid meme ads fatigue in days, so treat them as hooks, not evergreen."
        }
      ]
    }
  ],
  "howToRun": [
    "Pick one sharp angle. Example: “Your to-do list is why you never start.” Then wrap it four ways: Notes app, problem vs solution, 5 signs, greenscreen demo. Same script spine, different first frame.",
    "Film founder versions before you pay for AI podcast or claymation. Those formats win when the words are already proven — they do not fix a vague product.",
    "On every ad: hook in the first second, product by second 4–6, one claim, one next step. Captions burned in. No logo open."
  ]
}

```

### Appendix D2 — data/streams.json (8 stream moves, 2 categories)

Library type: stream_move. Items are keyed `ads`; normalize to `items`. Split each 'why' into its generic part and a Dopami ClientExample.

```json
{
  "title": "Streams",
  "eyebrow": "Dopami · Growth",
  "subtitle": "A livestreaming playbook for earning new reach — for any brand. Dopami's ADHD body-doubling streams are the worked example throughout.",
  "intro": "Live loses to produced video on polish, but wins on two things nothing else replicates: the real-time watch time platforms reward, and hours of raw footage a single stream hands you for weeks of short-form content. The brands that win with live treat the stream as a factory, not a performance.",
  "categories": [
    {
      "id": 1,
      "title": "The core loop",
      "blurb": "Three moves that turn a livestream from a one-off broadcast into a reach engine.",
      "ads": [
        {
          "num": "1",
          "name": "Livestream your core use case, with real customers",
          "frame": "Pick the single activity your product actually helps people do, and host it live with your community doing it together in real time. Choose a ritual people already want company for — working, practicing, studying, building — not a generic brand show.",
          "why": "Dopami example: live-stream Done Together body-doubling — “work with me” / “study with me” streams are a proven live format, and body doubling is a real ADHD need. People come back daily and leave the stream running for hours, exactly the watch time live earns — and it feeds directly into the product."
        },
        {
          "num": "2",
          "name": "Run the deep-dive weekly, not daily",
          "frame": "Depth beats frequency for authority content. Prepare one topic properly, go live for 45–60 minutes, and take real audience questions live instead of pre-scripting every answer.",
          "why": "Dopami example: a weekly ADHD topic deep-dive — “why starting is the hardest part,” “what executive dysfunction actually feels like” — with live Q&A from the community."
        },
        {
          "num": "3",
          "name": "Cut every stream into a content pipeline",
          "frame": "The live itself rarely drives new reach — the cut-downs do. Treat each stream as raw material: 5–8 Shorts plus one edited 10–12 minute video, pulled from the same session.",
          "why": "Dopami example: keep the daily email topic bank, but repoint it at Shorts ideas instead of writing prompts only — the bank becomes the backlog for clip titles and hooks."
        }
      ]
    },
    {
      "id": 2,
      "title": "Make it compound",
      "blurb": "Five more moves that keep the stream running without burning out the founder or starting from a blank page every week.",
      "ads": [
        {
          "num": "4",
          "name": "Name the show",
          "frame": "A recurring stream needs a fixed title, time slot, and thumbnail style so it reads as a show people can set a reminder for, not a one-off broadcast.",
          "why": "Dopami example: call it “Focus Hour,” same time every day, same simple thumbnail — recognizable in a crowded feed before anyone reads the caption."
        },
        {
          "num": "5",
          "name": "Let the chat become the content",
          "frame": "Live comments and questions are a free discovery engine. The moment a viewer names their real problem live is usually your most shareable clip — better than anything scripted in advance.",
          "why": "Dopami example: when someone in the body-doubling stream types “I finally started,” that's the Short — clip it (with consent) over anything pre-written."
        },
        {
          "num": "6",
          "name": "End on one low-friction CTA, and track the 48-hour conversion",
          "frame": "Every stream should close the same way, pointed at the free or trial version of the core product, so you can actually measure whether live is building the funnel or just the audience.",
          "why": "Dopami example: streams end with “stay in this room — open Done Together and keep working with us after the stream ends,” tracked against sign-ups in the next two days."
        },
        {
          "num": "7",
          "name": "Rotate a co-host instead of carrying it solo",
          "frame": "Founder burnout kills consistency faster than any algorithm change. A rotating co-host — a teammate, a power user, a category expert — adds variety and brings their own audience to discover the stream.",
          "why": "Dopami example: invite a real user to co-host a body-doubling session and talk through their actual routine instead of the founder narrating alone."
        },
        {
          "num": "8",
          "name": "Feed the live Q&A back into next week's content bank",
          "frame": "Questions people ask live are pre-validated topic ideas — they already proved someone cares enough to ask out loud. Route them back into the backlog instead of starting from a blank page each week.",
          "why": "Dopami example: questions from the weekly deep-dive become next week's Shorts, and the strongest ones graduate into the daily email prompt bank."
        }
      ]
    }
  ],
  "howToRun": [
    "Pick one ritual your product already supports, and go live doing it with your community for the first time this week — even unpolished.",
    "Set a fixed day and time for the deep-dive, publicize it once, and only add a second stream per week after the first one has a steady return audience.",
    "Build a lightweight clip workflow — even a single editor or a template — before the first stream ends, so the 5–8 Shorts actually ship within 48 hours. Momentum dies if the raw footage sits unused."
  ]
}

```

### Appendix E1 — assets/rotation.js (daily rotation)

Port exactly; see §8 parity tests.

```js
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

```

### Appendix E2 — assets/reelRotation.js (weekly rotation)

Port exactly; see §8 parity tests.

```js
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

```

### Appendix E3 — assets/copy.js (nudges + starter questions)

Shared by the website and the email so both always say the same thing for the same day.

```js
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

```

### Appendix F1 — scripts/send-daily-email.mjs (daily email template, reference)

Reference for the email template and plain-text body. Replace Nodemailer with the chosen provider.

```js
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
const SITE_URL = (process.env.SITE_URL || "https://abhisheknid.github.io/Content-reminder-for-abhisheknid").replace(/\/$/, "");

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

```

### Appendix F2 — scripts/send-weekly-reels-email.mjs (weekly email template, reference)

Reference for the weekly email template.

```js
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

```
