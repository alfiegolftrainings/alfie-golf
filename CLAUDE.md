# Alfie Golf Trainings — Project Memory

This file is loaded automatically at the start of every Cowork session. Read it fully before doing anything else. Confirm to Fabio that you've loaded the Alfie context.

---

## What this project is

**Alfie Golf Trainings** is a personalised golf coaching concierge run by Fabio. Golfers fill out a Google Form, Fabio builds a weekly practice plan using Claude, and the plan is delivered as a branded HTML card (interactive, emailed to the golfer). Golfers also get a personal dashboard at `alfie-golf.com/[slug]` to track their progress.

---

## Folder structure (this workspace)

```
alfie-golf/                          ← this folder = git repo = Cowork workspace
├── index.html                       ← golfer dashboard (Vercel serves at /)
├── golfer-dashboard.html            ← (alias / in-dev version)
├── golfer-profile.html              ← golfer profile page
├── cohort-dashboard.html            ← coach-facing cohort overview
├── plan-builder.html                ← Fabio's plan builder tool (NOT deployed — in .gitignore)
├── vercel.json                      ← Vercel routing config
├── CLAUDE.md                        ← this file
├── learned-preferences.md           ← skill preference learning
├── apps-script.js                   ← Google Apps Script reference code
├── .gitignore                       ← excludes plan-builder.html, docs/, temp files
├── plans/                           ← all plan HTML files, flat (served at /plans/*)
│   ├── adi-dobson-week1-plan.html
│   ├── mark-minervini-week1-plan.html
│   └── ... (60 files, naming: [firstname-lastname]-weekN-plan.html)
└── docs/                            ← reference docs, NOT deployed
    ├── alfie-dashboard-dev-guide.docx
    └── alfie-new-chat-context.docx
```

### Key rules for this structure
- **New plan files** go directly into `plans/` — no per-golfer subfolders
- **Naming:** `[firstname-lastname]-weekN-plan.html` — all lowercase, hyphens, no cohort prefix
- **C02 exception:** existing C02 files use `C02-[name]-weekN-plan.html` — keep that convention for C02 to match Google Sheet values
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

## The full workflow

```
1. Golfer submits Google Form
2. Fabio opens plan-builder.html → selects golfer from dropdown → fields auto-fill
3. Fabio adds any "Additional inputs" (follow-up emails, extra context)
4. Fabio clicks "Copy for Claude — Create plan" → pastes into Claude
   → alfie-plan-creator skill fires → outputs plain text plan in a code block
5. Fabio pastes plan text into plan-builder → clicks "Generate Preview"
   → visual card renders in the right panel
6. If changes needed: Fabio types notes, clicks "Copy changes" → pastes into Claude
   → alfie-plan-review skill fires → outputs revised plan
   → Fabio pastes updated plan back, regenerates preview
7. When happy: Fabio clicks "Approve & Generate files" → pastes into Claude
   → alfie-file-generator skill fires → saves HTML to plans/
8. Commit and push → Vercel auto-deploys
```

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
- **Trigger phrase:** `Approved — save [Name] Week N as HTML and PDF`
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
- mailto body includes all drill scores + Q1/Q2/Q3/Q4 answers
- Mobile-responsive, max-width 560px centered

---

## Google Sheet connection

- Sheet ID: `1FaZ-NhnoLUJx-__-nvaELy2iQsuDIlEJl8LhPZ_gZBk`
- Apps Script `/exec` URL stored in `localStorage` key: `alfie_builder_sheet_url`
- `Cohort2` tab: golfer data (slug, name, planWeek1 filename, etc.)
- `Results` tab: session submissions

---

## Contact

- Golfer score submissions go to: `alfie.golf.trainings@gmail.com`
- Fabio's email: `fabio.pengue@gmail.com`

---

## Golfer roster

### Cohort 1 (C01) — plans in plans/
01 Adi Dobson · 02 Mark Minervini · 03 Joon D · 04 Devin Willis · 05 Roy Johns
06 Adam (C01-06) · 07 Ross · 08 Lawrence · 09 Kris · 10 JD Hankins · 11 Niall
12 Joey · 13 Jonathan Pile · 14 Matteo · 15 Dylan · 16 Leroy Kapping · 17 Lester
18 Tyler Dahnke · 19 Jon · 20 Daniel Lewis · 21 Dickie Chute · 22 Adam (C01-22)
23 Joe · 24 Charlie · 25 Will · 26 Ed · 27 Russ · 28 Jim · 29 Apollos Gause
30 Rob Reid · 31 Colin · 32 Dave · 33 Danny · 34 Rob · 35 Alex · 36 Joel Sati
37 Tanner Meyer · 38 Rachel Smith · 39 Gonzalo · 40 Tom

### Cohort 2 (C02) — plans in plans/ with C02- prefix
01 Atticus B · 02 Mike · 03 Josh · 04 Kyle · 05 Ross · 06 Austin · 07 Ryan
08 Joe L ⚠️ (plan file needs manual copy — see note below) · 09 Bob · 10 Nate J
11 Josh (C02-11) · 12 Andy Metzner · 13 Tucker · 14 Mike Vega · 15 Matt Sather
16 Joshua · 17 Luke P · 18 Mark · 19 Luis Chavez · 20 Luis Chavez (C02-20)

⚠️ **C02 Joe L**: `C02-joe-l-week1-plan.html` could not be copied automatically due to a filesystem permission issue. Copy manually from:
`Alfie Golf Training\C02-08-joe-l\C02-joe-l-week1-plan.html` → `alfie-golf\plans\C02-joe-l-week1-plan.html`

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
