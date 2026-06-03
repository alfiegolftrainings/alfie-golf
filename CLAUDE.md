# Alfie Golf Trainings — Project Memory

This file is loaded automatically at the start of every Cowork session. Read it fully before doing anything else. Confirm to Fabio that you've loaded the Alfie context.

---

## What this project is

**Alfie Golf Trainings** is a personalised golf coaching concierge run by Fabio. Golfers fill out a Google Form, Fabio builds a weekly practice plan using Claude, and the plan is delivered as a branded HTML card (interactive, emailed to the golfer). Golfers also get a personal dashboard at `alfie-golf.com/[slug]` to track their progress.

### Phase 0 — Concierge test (current)
C01 (40 golfers) and C02 (40 golfers) are the live test cohorts. The workflow is intentionally manual: Fabio builds every plan by hand using Claude + plan-builder.html, sends emails via the Worker, and tracks results on the cohort dashboard. The goal is to validate engagement, retention, and plan quality before automating anything.

### Phase 1 — Product (if concierge test is promising)
If C01/C02 results show meaningful engagement (golfers logging sessions, requesting Week 2, wanting to continue), the plan is to evolve Alfie into a proper SaaS product for golf coaches. Key ideas:

- **Self-serve onboarding:** golfer fills a form → plan auto-generated (AI, no manual step) → delivered in minutes
- **Coach dashboard as the core product:** coach manages a roster of golfers, sees engagement funnel, sends plans, tracks week-over-week progress
- **Multi-coach:** any golf coach can sign up, import their roster, and run their own Alfie concierge
- **Subscription model:** coaches pay per active golfer or per cohort
- **The current stack is production-ready:** Cloudflare Worker + D1 + Resend + Vercel scales to thousands of golfers with zero infrastructure changes
- **What needs to be built:** auth layer (Cloudflare Access or Clerk), self-serve plan generation endpoint (Claude API in the Worker), coach onboarding flow, billing (Stripe)

---

## Stack

- **Email inbox:** trainings@alfie-golf.com on Fastmail ($3/month)
- **Email sending:** Resend (API key stored as `RESEND_API_KEY` Worker secret) — sends from `trainings@alfie-golf.com`. Resend account: alfie.golf.trainings@gmail.com
- **DNS:** Cloudflare (alfie-golf.com)
- **Frontend:** Vercel (alfie-golf.com, auto-deploys from GitHub `alfiegolftrainings/alfie-golf` — repo is **public**)
- **Backend API:** Cloudflare Worker at `https://alfie-api.alfie-golf.workers.dev/`
- **Database:** Cloudflare D1 — database `alfie-db`, ID `4ad82829-7c49-4bca-a1a9-33cab641e56d`
- **Google Sheet (signups):** Reference only — Sheet ID `1FaZ-NhnoLUJx-__-nvaELy2iQsuDIlEJl8LhPZ_gZBk`, tab "Users List". D1 is the single source of truth.
- **sync-to-d1.js:** Apps Script (read-only Sheet → POST to Worker upsertGolfer) — file at `docs/sync-to-d1.js`

---

## Folder structure (this workspace)

```
alfie-golf/                          ← this folder = git repo = Cowork workspace
├── index.html                       ← golfer dashboard (Vercel serves at /)
├── cohort-dashboard.html            ← coach-facing cohort overview (Phase C — not yet D1-native)
├── plan-builder.html                ← Fabio's plan builder tool (NOT deployed — in .gitignore)
├── vercel.json                      ← Vercel routing config
├── CLAUDE.md                        ← this file
├── learned-preferences.md           ← skill preference learning
├── .gitignore                       ← excludes plan-builder.html, docs/, temp files
├── plans/                           ← all plan HTML files, flat (served at /plans/*)
│   ├── c01-01-adi-dobson-week1-plan.html
│   ├── c02-01-atticus-b-week1-plan.html
│   └── ... (naming: c0X-YY-[name]-weekN-plan.html)
└── docs/                            ← reference docs, NOT deployed
```

### Key rules for this structure
- **New plan files** go directly into `plans/` — no per-golfer subfolders
- **Naming:** `c0X-YY-[name]-weekN-plan.html` — all lowercase, hyphens (e.g. `c01-01-adi-dobson-week1-plan.html`)
- **Slug format:** `c0X-YY-[name]` — same prefix as filename without `-weekN-plan.html` (e.g. `c01-01-adi-dobson`, `c00-fabio`)
- **plan-builder.html** is in `.gitignore` — it never deploys to Vercel, stays local only
- **No copying needed** — this folder IS the git repo. Edit here → push → auto-deploys

---

## Git / Vercel deployment

- Git repo: `alfie-golf` on GitHub (connected to Vercel)
- Auto-deploys on push to `main`
- Vercel domain: `alfie-golf.com`
- `vercel.json` rewrites all paths except `/plans/*` to `index.html`
- Plan files served statically at `/plans/[filename]`

### ⚠️ Git workflow rule
**Claude cannot push from the sandbox** — no credentials. After code changes, tell Fabio to run `git push` from the `alfie-golf` folder. Plan files are pushed automatically by plan-builder via the GitHub API (PAT) — no manual push needed for plans.

Git user config for the repo: `user.email = alfie.golf.trainings@gmail.com`, `user.name = alfiegolftrainings`. Required so Vercel (Hobby plan, public repo) accepts commits from any author.

---

## Worker API (`alfie-api`)

Repo folder: `alfie-golf-trainings/alfie-api/` (separate from the frontend repo)
Deploy: `npx wrangler deploy` from that folder (must run on Fabio's machine, not the sandbox)
Cron: runs every minute (`* * * * *`) to fire scheduled sends

### Endpoints

| Action | Method | Description |
|---|---|---|
| `getGolferBySlug` | GET `?action=getGolferBySlug&slug=X` | Returns golfer data from D1 |
| `getGolferResults` | GET `?action=getGolferResults&slug=X` | Returns all sessions for golfer |
| `submitSession` | POST `?action=submitSession` | Upserts a session (drills, scores, Q1–Q4); notifies coach via email |
| `requestWeek2` | POST `?action=requestWeek2` | Marks week 2 requested (inserts sentinel row); notifies coach |
| `sendPlan` | POST `?action=sendPlan` | Sends plan email immediately via Resend + stamps week1_sent/week2_sent in D1 |
| `scheduleSend` | POST `?action=scheduleSend` | Stores a future send in D1 `scheduled_sends`; Worker cron fires it |
| `upsertGolfer` | POST `?action=upsertGolfer` | Insert or update a full golfer record (used by sync-to-d1.js) |
| `listGolfers` | GET `?action=listGolfers&cohort=C01[&hasSessions=true]` | Returns slug + name + email; `hasSessions=true` filters to golfers with ≥1 session (used by plan-builder Week 2 filter) |
| `sendReengagement` | POST `?action=sendReengagement` | Sends "Still with us?" email linking directly to plan |
| `sendApologyEmail` | POST `?action=sendApologyEmail` | Sends apology/correction email with correct dashboard link — payload: `{ slug }` |

### sendPlan / scheduleSend payloads
```json
{ "planFile": "c02-02-mike-lovitto-week1-plan.html", "email": "golfer@email.com", "week": 1 }
{ "planFile": "c02-02-mike-lovitto-week1-plan.html", "email": "golfer@email.com", "week": 1, "sendAt": "2026-06-01T09:00:00.000Z" }
```
Pass `"slug"` instead of `"planFile"` if preferred — Worker looks up the plan filename from D1 via 3-tier lookup: slug → planFile match → derive slug from filename.

### sendReengagement payload
```json
{ "slug": "c01-01-adi-dobson", "week": 1 }
```

### Email behaviour
- **Plan delivery** (`sendPlan`): links to `alfie-golf.com/[slug]`. CTA: "Access your dashboard →". Stamps `week1_sent` / `week2_sent` in D1. Dashboard gates "Open Week 2" button on `week2_sent` being non-empty.
- **Re-engagement** (`sendReengagement`): "Still with us?" — links directly to plan file.
- **Apology/correction** (`sendApologyEmail`): used when wrong link was sent. Links to correct dashboard.
- **Coach session notification** (`submitSession`): sent to `trainings@alfie-golf.com` with drill scores + Q1–Q4.
- **Coach Week 2 request** (`requestWeek2`): sent to `trainings@alfie-golf.com` with session data + "Generate Week 2 plan" CTA.
- All sent from `Alfie Golf Trainings <trainings@alfie-golf.com>` via Resend.

### ⚠️ Resend API key
- Stored as Cloudflare Worker secret `RESEND_API_KEY`. To update: run `npx wrangler secret put RESEND_API_KEY` interactively (do NOT use `echo "key" |` on Windows — adds `\r` and corrupts the key). Paste the key when prompted.
- Claude can trigger emails via Chrome MCP by calling Worker endpoints directly — no terminal needed.

### ⚠️ D1 cohort values
`'1'`, `'2'`, `'W'`, `'Test'` — NOT `'C01'`/`'C02'`. The `listGolfers` slug-LIKE filter works because SQLite LIKE is case-insensitive for ASCII.

### D1 tables
- **golfers:** slug, name, email, contact, handicap, frustration, sessions_per_week, session_duration, facilities, cohort, plan_week1, plan_week2, week1_sent, week2_sent, notes
- **sessions:** id, slug, week, session, date, drills (JSON array of `{name, score, max}`), scores (JSON), q1, q2, q3, q4. UNIQUE(slug, week, session).
- **scheduled_sends:** id, plan_file, email, week, send_at, sent (0/1)

---

## The full workflow

```
1. Golfer submits Google Form
2. Fabio opens plan-builder.html (local only)
   - Select cohort (C00 Test / C01 / C02) → pick golfer from D1 dropdown → fields auto-fill
   - If Week 2: Week 1 session feedback panel auto-appears (scores, Q1–Q3 from D1)
   - Add any "Additional inputs" (follow-up emails, extra context)
3. Fabio clicks "Generate Plan"
   → alfie-plan-creator skill fires → outputs plain text plan in a code block
4. Fabio pastes plan text into plan-builder → preview renders in right panel
5. If changes needed: Fabio types notes, clicks "Apply Changes"
   → alfie-plan-review skill fires → outputs revised plan → Fabio pastes back
6. When happy: Fabio clicks "Approve & Save HTML"
   → send dialog: "Send Now" / "Schedule Send" / "Skip"
   → generateStandalonePlanHTML() (pure JS template, no API call) generates the HTML
   → progress modal: Step 1 plans/ folder, Step 2 generate HTML, Step 3 validate,
     Step 4 email via Worker sendPlan/scheduleSend, Step 5 push to GitHub via API (PAT)
   → file saved to plans/ locally + pushed to GitHub → Vercel auto-deploys
   → plan email sent (or queued) to golfer via Resend
```

**Note:** `generateStandalonePlanHTML()` is a pure JS template function inside plan-builder.html. The `alfie-file-generator` skill is NOT used by plan-builder — it's only triggered by the manual chat flow ("Approved — save…" typed into Claude).

---

## plan-builder.html features

- **D1 golfer loader:** Cohort dropdown → golfer dropdown → auto-fills name, email, handicap, frustration
- **Week 1 feedback panel:** Auto-appears when Week 2 selected — fetches sessions from `getGolferResults`, shows drill scores + Q1–Q3 per session
- **GitHub auto-push:** PAT stored in localStorage (`alfie_gh_pat`). Settings section in plan-builder. Requires `contents: write` scope on `alfiegolftrainings/alfie-golf`.
- **Progress modal:** 5 steps — Folder, Generate HTML, Validate, Email, GitHub push. Resets cleanly between runs.
- **Send dialog:** Send Now / Schedule Send (datetime picker, default tomorrow 9am) / Skip

---

## Golfer dashboard (index.html)

- Boot: fetches `getGolferBySlug` + `getGolferResults` in parallel
- **State 1** (no sessions): hero card with "Open my plan" primary, "Log training session" amber
- **State 2** (sessions logged): hero card with "Open Week N plan" primary, "Log session N+1" secondary
- **KWT modal** ("Keep working together"): lime green checkmark circle, green "Request sent!" title
- **Alfie coach quote:** Updates dynamically per session number and latest Q1/Q3 feedback
- **Desktop centering:** max-width 860px
- Session log modal: submits `drills: [{name, score, max}]` to Worker — drill names and scores recorded in D1 and coach email
- `submitSession` from plan HTML: also sends `drills` array (not empty) with name/score/max from score inputs

---

## HTML card spec (canonical as of 2026-05-31)

Full spec in `alfie-golf/docs/plan-design-system.md`. Summary:

- Single self-contained HTML file, saved to `plans/`
- Body background: `#063d31` | Feedback card: solid `#0d6b51` | Drill cards: `#fff`
- **Topo background:** `<canvas id="topo-bg">` — marching squares algorithm, 12 Gaussian hills, 40 contour levels, `rgba(255,255,255,0.09)` stroke. **Not** SVG ellipses.
- Opening card: `linear-gradient(135deg, #1a7a5e, #0a5740)` with left border `#5DCAA5`
- Overview chips: solid `#0d6b51`
- Back link: SVG chevron, slug parsed from `window.location.pathname` at runtime
- Score inputs: `<input type="number" oninput="checkReady()">` per drill
- Q1–Q4 tile buttons: `#ffc846` amber selected / `rgba(255,255,255,0.14)` unselected / `#fff` labels
- Q5: optional open-text textarea
- **Send button — gated, disabled by default. POSTs to Worker `submitSession` with `drills` array.**
- `drills` payload: `[{name: "Drill Name", score: <input value>, max: N}]` — built at submission time
- Success overlay: circular checkmark, `#0d6b51` card, "Back to dashboard →" link
- Mobile-responsive, max-width 560px centered

---

## Skills

### alfie-plan-creator
- **Trigger phrase:** `Create plan — [Name]`
- **Role:** PGA Teaching Professional generating the initial plan
- **Input:** Session duration + Google Form responses + optional Additional inputs
- **Output:** Plain text plan inside a triple-backtick code block — NO widgets, NO HTML
- **After the code block:** 2–3 line note to Fabio flagging assumptions or concerns
- **Read `learned-preferences.md` before writing a single word**

### alfie-plan-review
- **Trigger phrase:** `Requested changes — [Name]`
- **Role:** Quality control and change application only
- **Input:** Latest plan text + change notes
- **Output:** Full revised plan as plain text in a code block + 1–2 line note
- **After output:** Extract learnable rules, append to `learned-preferences.md`
- **Does NOT:** Generate plans from scratch, generate HTML files, render widgets

### alfie-file-generator
- **Trigger phrase:** `Approved — save [Name] Week N as HTML`
- **Role:** File generation via chat only (NOT used by plan-builder)
- **Output:** `plans/[slug]-weekN-plan.html`
- **Always includes:** Feedback section (Q1–Q4) + gated send button
- **Does NOT:** Generate or modify plans, generate PDFs, render widgets

---

## Plan format (both skills must follow this exactly)

```
OPENING
[2–4 sentences. Reference their exact frustration. Warm, direct.]

SESSION OVERVIEW
- Total time: [X min]
- Location: [Driving range / Short game area / On course / etc.]
- This week's focus: [One-line summary]

DRILLS

[Drill Name] · [X min]

What to do:
[Step-by-step. Specific ball counts, targets, setup. No ambiguity.]

Why this matters for you:
[Must reference a specific detail from their form — handicap, exact frustration, goal.]

Score to record:
[Short label: __ / N unit]

CLOSING
[2–3 sentences. Reference one real form detail. No invented details.]
```

### Drill count rules (strict)
| Session duration | Max drills |
|---|---|
| 30 min | 1–2 |
| 45 min | 2 |
| 60 min | 2–3 |
| 90+ min | 3–4 |

### Score format rules
- Every drill has exactly one "Score to record" section
- Each score line: `Short label: __ / N unit` (e.g. "Fairway hits: __ / 10 shots")
- Label must be 1–3 words. Never "Number of…" or a full sentence.
- Multiple scores allowed: one per line, each with its own label

---

## Review checklist (run before every approval)

- [ ] Opening references the golfer's exact frustration or their own words
- [ ] Every "Why this matters" contains a specific form detail
- [ ] Closing has no invented details (no course specifics, goals, or shot shapes not in the form)
- [ ] All drills use only facilities the golfer listed
- [ ] Total drill time ≤ session duration minus 5 min buffer
- [ ] Every drill has exactly one "Score to record"
- [ ] Score is completable within the drill's allotted time

---

## Key design decisions (do not revisit without reason)

- **Three-skill architecture** — creator makes the plan, reviewer applies changes, file-generator produces HTML only (no PDF). Creator never renders HTML. Reviewer never generates files. File-generator never modifies plan text.
- **plan-builder generates HTML internally** — via `generateStandalonePlanHTML()`, a pure JS template. alfie-file-generator is only for the manual chat flow.
- **Plain text output from creator** — so Fabio can paste into plan-builder and preview before approval.
- **No widgets in either skill** — preview happens in plan-builder.html, not in chat.
- **Personalization over templates** — every plan must feel built for that specific golfer. Generic plans get rejected.
- **Right to push back** — both skills can (and should) flag if a change would make the plan worse.
- **45 min = 2 drills max** — confirmed with Fabio.
- **First-session golfers** — keep to lower end of drill count range. Always mention in opening.
- **Fully Google-free** — never suggest Google Sheets, Gmail API, or Apps Script. Use Worker + D1 + Resend + Fastmail.
- **Email links to dashboard, not plan** — golfer lands on `alfie-golf.com/[slug]`, clicks "Open my plan" from there.

---

## Special session log pages

For golfers who can't complete the plan HTML form (device/browser compatibility issues), a standalone session log page can be created at `plans/[slug]-session.html`. These pages:
- Have no gating — all questions visible upfront
- POST directly to Worker `submitSession` with the same payload as the plan HTML
- Are sent to the golfer via a simple reply email with the URL

**Created so far:**
- `plans/c01-20-daniel-lewis-session.html` — Daniel Lewis (iPhone compatibility issue with Q4 unlock)

---

## Cohort dashboard (cohort-dashboard.html) — current state

Coach-facing dashboard. Loads data live from D1 via Worker on page open. Key features:
- **Engagement funnel (two-stage):** Week 1 (Participants → Logged a session → Ready for W2 via Q4 Yes) + Week 2 (Started → Logged a session → Want to continue). Bar fill proportional to count. Conversion % shown between steps. Green for W1, amber for W2.
- **"All cohorts" mode:** aggregates C01 + C02 only — excludes Test (C00) and Waitlist (W).
- **KPI cards, charts, golfer table, qualitative responses.**
- Not yet D1-native for all data — some fields (sessions_per_week, session_duration) pending Worker enhancement.

---

## Remaining build phases

- **Phase C:** D1-native cohort dashboard — add `getDashboardData` Worker endpoint to expose sessions_per_week + session_duration fields currently showing as "—"
- **Phase E:** Stress test Run 4 — resolve IMPROVE-1 through IMPROVE-7 backlog items first
- **Phase 1 (if concierge test is promising):** See Product Vision in "What this project is" above

---

## Contact

- Coach inbox (Fastmail): `trainings@alfie-golf.com`
- Fabio's personal email: `fabio.pengue@gmail.com`

---

## Golfer roster

C01 numbers = sequential 01–40. C02 numbers = sequential 01–40. D1 slugs: `c0X-YY-[name]` (e.g. `c01-01-adi-dobson`, `c02-01-atticus-b`). All 88 golfers imported into D1 as of 2026-05-31.

### C00 — Test cohort
01 Fabio (fabio.pengue@gmail.com) · slug: `c00-01-fabio` · HCP 24 · frustration: hook with driver from the tee

### Cohort 1 (C01) — 40 golfers — plans in plans/

01 Adi Dobson · 02 Mark · 03 Joon D · 04 Devin · 05 Roy Johns
06 Adam (accarter92) · 07 Ross (Ross7406) · 08 Lawrence · 09 Kris · 10 JD Hankins · 11 Niall
12 Joey · 13 Jonathan Pile · 14 Matteo · 15 Dylan · 16 Leroy Kapping · 17 Lester
18 Tyler Dahnke · 19 Jon · 20 Daniel Lewis · 21 Dickie Chute · 22 Adam (Adamwing78)
23 Joe · 24 Charlie · 25 Will · 26 Ed · 27 Russ · 28 Jim · 29 Apollos Gause
30 Rob Reid · 31 Colin · 32 Dave · 33 Danny · 34 Rob · 35 Alex · 36 Joel Sati
37 Tanner Meyer · 38 Rachel Smith · 39 Gonzalo · 40 Tom

### Cohort 2 (C02) — 40 golfers — all plans sent as of 2026-06-02/03

**Sent manually on 2026-06-02 (week1_sent stamped in D1):**
- 14 Mike Vega (mikevega4177@gmail.com) — sent 14:11 UTC
- 38 Neil M (millys1977@gmail.com) — sent 18:49 UTC. Plan has 3 drills: Putting Ladder (/40), 18-Hole 2-Putt Par Game (/par 36), 9-Hole Up-and-Down Challenge (/par 18).

**Scheduled in D1 `scheduled_sends` for 2026-06-03 13:00 UTC (15:00 CEST):**
01 Atticus B · 02 Mike (Lovitto) · 03 Josh (jlpsuperfly) · 04 Kyle · 05 Ross (lockrmail)
06 Austin (McAllistera92) · 07 Ryan (rtkindsfather) · 08 Joe L · 09 Bob · 10 Nate J
11 Josh (JJ.bana) · 12 Andy Metzner · 13 Tucker · 15 Matt Sather · 16 Joshua (Leftyjosh23)
17 Luke P · 18 Mark (mdecapua) · 19 Luis Chavez · 20 Miguel · 21 Matt (Kimball)
22 Alex Luna · 23 Hayden Frey · 24 Jason (torquato) · 25 J (Concon11) · 26 Robert Manning
27 Pete · 28 Michael (Meznar) · 29 Chase · 30 T.Sijtsma · 31 Spencer
32 Ryan (ryanschwartz1) · 33 Nick · 34 Jason (Jasonywkim) · 35 John (Burke) · 36 Miles
37 Ryan (Laporte) · 39 Chris (chrislikestogolf) · 40 Matthew (Cooper)

### Waitlist (W) — 7 golfers — no plans yet
81 Austin Miranda · 82 David Murphy · 83 Richard · 84 Chris (Itschrisq)
85 Darren · 86 Muk Sreenivasan · 87 Matthew Morris

---

## Preference learning system

### Preferences file
**Location:** `learned-preferences.md` (in this folder)

### When alfie-plan-creator fires
Read `learned-preferences.md` before writing a single word of the plan.

### When alfie-plan-review fires
After outputting the revised plan, extract learnable rules and append to `learned-preferences.md`.
Format: `- [YYYY-MM-DD] Rule or note text`
End response with: `📌 Saved to preferences: [brief summary]`
