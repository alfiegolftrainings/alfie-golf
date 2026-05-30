# Alfie Golf Trainings — Project Memory

This file is loaded automatically at the start of every Cowork session. Read it fully before doing anything else. Confirm to Fabio that you've loaded the Alfie context.

---

## What this project is

**Alfie Golf Trainings** is a personalised golf coaching concierge run by Fabio. Golfers fill out a Google Form, Fabio builds a weekly practice plan using Claude, and the plan is delivered as a branded HTML card (interactive, emailed to the golfer). Golfers also get a personal dashboard at `alfie-golf.com/[slug]` to track their progress.

---

## Stack (fully Google-free as of 2026-05-29)

- **Email inbox:** trainings@alfie-golf.com on Fastmail ($3/month)
- **Email sending:** Resend (API key stored as `RESEND_API_KEY` Worker secret) — sends from `trainings@alfie-golf.com`
- **DNS:** Cloudflare (alfie-golf.com)
- **Frontend:** Vercel (alfie-golf.com, auto-deploys from GitHub alfiegolftrainings/alfie-golf)
- **Backend API:** Cloudflare Worker at `https://alfie-api.alfie-golf.workers.dev/`
- **Database:** Cloudflare D1 — database `alfie-db`, ID `4ad82829-7c49-4bca-a1a9-33cab641e56d`
- **Google Sheet (signups):** Still the source of truth for golfer data — Sheet ID `1FaZ-NhnoLUJx-__-nvaELy2iQsuDIlEJl8LhPZ_gZBk`, tab "Users List"
- **Old Apps Script (email sending via Gmail):** DEPRECATED — alfie.golf.trainings@gmail.com suspended by Google
- **sync-to-d1.js:** New Apps Script (read-only from Sheet → POST to Worker upsertGolfer) — file at `docs/sync-to-d1.js`, paste into Google Sheet → Extensions → Apps Script → Run `syncToD1`

---

## Folder structure (this workspace)

```
alfie-golf/                          ← this folder = git repo = Cowork workspace
├── index.html                       ← golfer dashboard (Vercel serves at /)
├── golfer-dashboard.html            ← (alias / in-dev version)
├── golfer-profile.html              ← golfer profile page
├── cohort-dashboard.html            ← coach-facing cohort overview (Phase C — not yet D1-native)
├── plan-builder.html                ← Fabio's plan builder tool (NOT deployed — in .gitignore)
├── vercel.json                      ← Vercel routing config
├── CLAUDE.md                        ← this file
├── learned-preferences.md           ← skill preference learning
├── .gitignore                       ← excludes plan-builder.html, docs/, temp files
├── plans/                           ← all plan HTML files, flat (served at /plans/*)
│   ├── adi-dobson-week1-plan.html
│   ├── mark-minervini-week1-plan.html
│   └── ... (naming: [firstname-lastname]-weekN-plan.html)
└── docs/                            ← reference docs, NOT deployed
    ├── alfie-dashboard-dev-guide.docx
    └── alfie-new-chat-context.docx
```

### Key rules for this structure
- **New plan files** go directly into `plans/` — no per-golfer subfolders
- **Naming:** `[firstname-lastname]-weekN-plan.html` — all lowercase, hyphens, no cohort prefix
- **C02 exception:** existing C02 files use `C02-[name]-weekN-plan.html` — keep that for C02 to match D1 `plan_week1` values
- **plan-builder.html** is in `.gitignore` — it never deploys to Vercel, stays local only
- **No copying needed** — this folder IS the git repo. Edit here → commit → auto-deploys

---

## Git / Vercel deployment

- Git repo: `alfie-golf` on GitHub (connected to Vercel)
- Auto-deploys on push to `main`
- Vercel domain: `alfie-golf.com`
- `vercel.json` rewrites all paths except `/plans/*` to `index.html`
- Plan files are served statically at `/plans/[filename]`

---

## Worker API (`alfie-api`)

Repo folder: `alfie-golf-trainings/alfie-api/` (separate from the frontend repo)
Deploy: `npx wrangler deploy` from that folder
Cron: runs every minute (`* * * * *`) to fire scheduled sends

### Endpoints

| Action | Method | Description |
|---|---|---|
| `getGolferBySlug` | GET `?action=getGolferBySlug&slug=X` | Returns golfer data from D1 |
| `getGolferResults` | GET `?action=getGolferResults&slug=X` | Returns all sessions for golfer |
| `submitSession` | POST `?action=submitSession` | Upserts a session (drills, scores, Q1–Q4) |
| `requestWeek2` | POST `?action=requestWeek2` | Marks week 2 requested (inserts sentinel row) |
| `sendPlan` | POST `?action=sendPlan` | Sends plan email immediately via Resend + stamps week1_sent/week2_sent in D1 |
| `scheduleSend` | POST `?action=scheduleSend` | Stores a future send in D1 `scheduled_sends`; Worker cron fires it |
| `upsertGolfer` | POST `?action=upsertGolfer` | Insert or update a full golfer record (used by sync-to-d1.js Apps Script) |
| `listGolfers` | GET `?action=listGolfers&cohort=C01` | Returns slug + name + email for all golfers, optionally filtered by cohort prefix |

### sendPlan / scheduleSend payloads
```json
{ "planFile": "C02-mike-week1-plan.html", "email": "golfer@email.com", "week": 1 }
{ "planFile": "C02-mike-week1-plan.html", "email": "golfer@email.com", "week": 1, "sendAt": "2026-06-01T09:00:00.000Z" }
```
Pass `"slug"` instead of `"planFile"` if preferred — Worker looks up the plan filename from D1.

### Email sent to golfers
- Links to the golfer's **dashboard** (`alfie-golf.com/[slug]`), not directly to the plan file
- Branded HTML email: dark green header, green CTA button "Access your dashboard →", friendly copy, footer with Fabio's email
- Golfer opens dashboard → clicks "Open my plan" to access the plan card

### D1 tables
- **golfers:** slug, name, email, contact, handicap, frustration, sessions_per_week, session_duration, facilities, cohort, plan_week1, plan_week2, week1_sent, week2_sent, notes
- **sessions:** id, slug, week, session, date, drills (JSON), scores (JSON), q1, q2, q3, q4
- **scheduled_sends:** id, plan_file, email, week, send_at, sent (0/1)

> ⚠️ **Schema migration required before import works.** Run each line separately (errors on already-existing columns are safe to ignore):
> ```
> npx wrangler d1 execute alfie-db --remote --command "ALTER TABLE golfers ADD COLUMN email TEXT DEFAULT '';"
> npx wrangler d1 execute alfie-db --remote --command "ALTER TABLE golfers ADD COLUMN contact TEXT DEFAULT '';"
> npx wrangler d1 execute alfie-db --remote --command "ALTER TABLE golfers ADD COLUMN cohort TEXT DEFAULT '';"
> npx wrangler d1 execute alfie-db --remote --command "ALTER TABLE golfers ADD COLUMN sessions_per_week TEXT DEFAULT '';"
> npx wrangler d1 execute alfie-db --remote --command "ALTER TABLE golfers ADD COLUMN session_duration TEXT DEFAULT '';"
> npx wrangler d1 execute alfie-db --remote --command "ALTER TABLE golfers ADD COLUMN facilities TEXT DEFAULT '';"
> ```

---

## The full workflow

```
1. Golfer submits Google Form
2. Fabio opens plan-builder.html (local only)
   - Select cohort (C00 Test / C01 / C02) → pick golfer from D1 dropdown → fields auto-fill
   - OR enter golfer name, email, session duration manually and paste form responses
   - Add any "Additional inputs" (follow-up emails, extra context)
3. Fabio clicks "Copy for Claude — Create plan" → pastes into Claude
   → alfie-plan-creator skill fires → outputs plain text plan in a code block
4. Fabio pastes plan text into plan-builder → clicks "Generate Preview"
   → visual card renders in the right panel
5. If changes needed: Fabio types notes, clicks "Copy changes" → pastes into Claude
   → alfie-plan-review skill fires → outputs revised plan
   → Fabio pastes updated plan back, regenerates preview
6. When happy: Fabio clicks "Approve & Save HTML"
   → send dialog appears: "Send Now" or "Schedule Send" (date/time picker)
   → alfie-file-generator skill fires → saves HTML to plans/
   → plan-builder Step 4 calls Worker sendPlan or scheduleSend
   → branded email sent (or queued) to golfer via Resend
7. Commit and push → Vercel auto-deploys
```

---

## plan-builder.html — D1 golfer loader

Step 1 of plan-builder now has a "Load golfer from D1" section:
- Cohort dropdown: **Test (C00)**, **Cohort 1 (C01)**, **Cohort 2 (C02)**
- Selecting a cohort calls `listGolfers?cohort=C0X` → populates a golfer dropdown
- Selecting a golfer calls `getGolferBySlug` → auto-fills name, email, handicap, frustration fields
- Form responses are still pasted manually (Google Form → copy → paste into the textarea)

---

## plan-builder.html — send dialog

When Fabio clicks "Approve & Save HTML", before the progress modal opens, a send dialog appears:
- **Send Now** — calls `sendPlan` immediately
- **Schedule Send** — shows a datetime-local picker (defaults to tomorrow 9am), calls `scheduleSend`; Worker cron fires the email at the right time
- **Skip** — skips email entirely; Step 4 shows a warning but file is still saved

---

## D1 data import from Google Sheet

**Source:** Google Sheet ID `1FaZ-NhnoLUJx-__-nvaELy2iQsuDIlEJl8LhPZ_gZBk`, tab "Users List"

**Total golfers in sheet:** 87 (40 × C01, 40 × C02, 7 × Waitlist) + 1 C00 test golfer (Fabio) = 88 in D1 when complete

**Import tool:** `docs/sync-to-d1.js` — Apps Script
- Open the Google Sheet → Extensions → Apps Script → paste content of sync-to-d1.js → Run `syncToD1`
- Maps cohort column: `"1"` → `"C01"`, `"2"` → `"C02"`, `"W"` / `"WAITLIST"` → `"W"`
- Generates slugs: `cohort.toLowerCase() + '-' + firstName.toLowerCase()` (e.g. `c01-adi-dobson`, `c02-atticus-b`)
- Extracts email from "Contact" column via regex (handles mixed WhatsApp + email entries)
- Calls Worker `upsertGolfer` for each row — INSERT or UPDATE, safe to re-run

**Status as of 2026-05-30:** Import attempted but likely failed — D1 schema migration (ALTER TABLE for new columns) had not been run first. Must run ALTER TABLE commands (see D1 tables section above), then re-run the Apps Script.

**C00 test golfer (Fabio):** slug `c00-01-fabio`, cohort `Test`, email `fabio.pengue@gmail.com`, HCP 24, frustration: hook with driver from the tee — insert manually or add a row in the sheet with cohort "Test"

**Special cases in the sheet:**
- Row 54 Mike Vega: phone number only (239-872-0974), no email → email field will be empty in D1
- Row 78 Neil M: phone number only (+447769928932), no email → email field will be empty in D1
- Rows 60–80: C02 golfers with no Week 1 plan sent yet (newer signups)
- Rows 81–87: Waitlist (W) — Austin Miranda, David Murphy, Richard, Chris, Darren, Muk Sreenivasan, Matthew Morris

---

## Skills

### alfie-plan-creator
- **Trigger phrase:** `Create plan — [Name]`
- **Role:** PGA Teaching Professional generating the initial plan
- **Input:** Session duration + Google Form responses + optional Additional inputs
- **Output:** Plain text plan inside a triple-backtick code block — NO widgets, NO HTML
- **After the code block:** 2–3 line note to Fabio flagging assumptions or concerns

### alfie-plan-review
- **Trigger phrase:** `Requested changes — [Name]`
- **Role:** Quality control and change application only
- **Input:** Latest plan text + change notes
- **Output:** Full revised plan as plain text in a code block + 1–2 line note
- **Does NOT:** Generate plans from scratch, generate HTML files, render widgets

### alfie-file-generator
- **Trigger phrase:** `Approved — save [Name] Week N as HTML`
- **Role:** File generation — saves approved plan as HTML to `plans/`
- **Output:** `plans/[name]-weekN-plan.html`
- **Always includes:** Feedback section (Q1–Q4) + gated send button in HTML
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
[One measurable metric. Completable in the drill time.]

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
- **Plain text output from creator** — so Fabio can paste into plan-builder and preview before approval.
- **No widgets in either skill** — preview happens in plan-builder.html, not in chat.
- **Personalization over templates** — every plan must feel built for that specific golfer. Generic plans get rejected.
- **Right to push back** — both skills can (and should) flag if a change would make the plan worse.
- **45 min = 2 drills max** — confirmed with Fabio.
- **First-session golfers** — keep to lower end of drill count range. Always mention in opening.
- **Fully Google-free** — never suggest Google Sheets, Gmail API, or Apps Script. Use Worker + D1 + Resend + Fastmail.
- **Email links to dashboard, not plan** — golfer lands on `alfie-golf.com/[slug]`, clicks "Open my plan" from there.

---

## HTML card spec (for alfie-file-generator on approval)

- Single self-contained HTML file, saved to `plans/`
- Background: `#085041` (dark green)
- Primary green: `#1D9E75` | Light green text: `#9FE1CB` | Pale green bg: `#E1F5EE`
- Drill cards: white (`#fff`) on dark background
- Decorative: concentric circle SVG (top-right, opacity 0.06) + dot-grid SVG (left edge, opacity 0.07)
- Score inputs: `<input type="number" oninput="checkReady()">` per score field
- **Closing + Feedback — merged into one dark glass card (mandatory in every plan)**
- **Send button — gated, disabled by default**
- mailto subject: `"Week N results — [Name]"`
- mailto body includes all drill scores + Q1/Q2/Q3/Q4 answers — sent to `trainings@alfie-golf.com`
- Mobile-responsive, max-width 560px centered

---

## Remaining build phases

- **Phase B:** Email notifications — Worker sends email to `trainings@alfie-golf.com` when `submitSession` or `requestWeek2` is called
- **Phase A:** Questionnaire redesign — update plan HTML files to use tile-based Q1–Q4 instead of text fields (with optional open text)
- **Phase C:** D1-native cohort dashboard — add `getDashboardData` Worker endpoint, update `cohort-dashboard.html` to use Worker instead of Google Sheet
- **Phase E:** Full end-to-end test — create plan, send via Resend, access dashboard, log session, request Week 2

---

## Contact

- Coach inbox (Fastmail): `trainings@alfie-golf.com`
- Fabio's personal email: `fabio.pengue@gmail.com`

---

## Golfer roster

Golfer numbers below = row order in the Google Sheet "Users List" tab. D1 slugs are generated as `cohort-firstname` (e.g. `c01-adi-dobson`).

### C00 — Test cohort
01 Fabio (fabio.pengue@gmail.com) · slug: c00-01-fabio · HCP 24 · frustration: hook with driver

### Cohort 1 (C01) — 40 golfers — plans in plans/
Sheet rows 1–7, 9, 11–17, 19, 22–31, 33–35, 37–41, 44, 46, 48–49, 52–53

01 Adi Dobson · 02 Mark · 03 Joon D · 04 Devin · 05 Roy Johns
06 Adam (accarter92) · 07 Ross (Ross7406) · 08 Lawrence · 09 Kris · 10 JD Hankins · 11 Niall
12 Joey · 13 Jonathan Pile · 14 Matteo · 15 Dylan · 16 Leroy Kapping · 17 Lester
18 Tyler Dahnke · 19 Jon · 20 Daniel Lewis · 21 Dickie Chute · 22 Adam (Adamwing78)
23 Joe · 24 Charlie · 25 Will · 26 Ed · 27 Russ · 28 Jim · 29 Apollos Gause
30 Rob Reid · 31 Colin · 32 Dave · 33 Danny · 34 Rob · 35 Alex · 36 Joel Sati
37 Tanner Meyer · 38 Rachel Smith · 39 Gonzalo · 40 Tom

### Cohort 2 (C02) — 40 golfers — plans in plans/ with C02- prefix
Sheet rows 8, 10, 18, 20–21, 32, 36, 42–43, 45, 47, 50–80

**Plans sent (rows 8,10,18,20–21,32,36,42–43,45,47,50–59):**
01 Atticus B · 02 Mike (Lovitto) · 03 Josh (jlpsuperfly) · 04 Kyle · 05 Ross (lockrmail)
06 Austin (McAllistera92) · 07 Ryan (rtkindsfather) · 08 Joe L ⚠️ · 09 Bob · 10 Nate J
11 Josh (JJ.bana) · 12 Andy Metzner · 13 Tucker · 14 Mike Vega (📵 phone only) · 15 Matt Sather
16 Joshua (Leftyjosh23) · 17 Luke P · 18 Mark (mdecapua) · 19 Luis Chavez

**No plan sent yet (rows 60–80):**
20 Miguel · 21 Matt (Kimball) · 22 Alex Luna · 23 Hayden Frey · 24 Jason (torquato)
25 J (Concon11) · 26 Robert Manning · 27 Pete · 28 Michael (Meznar) · 29 Chase
30 T.Sijtsma · 31 Spencer · 32 Ryan (ryanschwartz1) · 33 Nick · 34 Jason (Jasonywkim)
35 John (Burke) · 36 Miles · 37 Ryan (Laporte) · 38 Neil M (📵 phone only) · 39 Chris (chrislikestogolf)
40 Matthew (Cooper)

⚠️ **C02 Joe L**: `C02-joe-l-week1-plan.html` could not be copied automatically due to a filesystem permission issue. Copy manually from:
`Alfie Golf Training\C02-08-joe-l\C02-joe-l-week1-plan.html` → `alfie-golf\plans\C02-joe-l-week1-plan.html`

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
