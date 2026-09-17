# District Plans — the full flow, screen by screen

The definitive UX spec for the group-plan feature. Built from the job, not the screens. This is the source of truth for the build.

## The one job
"Turn 'we should go out' into a night that actually happens — without me chasing people or fronting the money."

Two people live inside that job:
- **The Organiser** — the friend who starts it. Already opens District, already books.
- **The Invitee** — has the means and the wish, says yes loosely, commits late.

Under the practical job sit five emotional ones. Every screen has to answer at least one:
1. "I don't want to be the pushy one nagging everyone."
2. "I don't want to be stuck paying, then chasing people for money."
3. "I don't want to commit to a night no one shows up to."
4. "I don't want to download another app, or make my friends download one."
5. "I want to know it's actually locked, not still 'maybe'."

## The spine (one path, three ways in)
```
COMPOSE  →  WHO'S COMING  →  INVITE  →  IT FILLS (live)  →  LOCKS ITSELF  →  YOU'RE OUT  →  live plan card
 (3 ways)     (crew)         (WhatsApp)   (roster + nudge)     (auto)         (booked+split)     (+ re-plan)
```
Three ways into COMPOSE, all converging at "who's coming":
1. **Suggestion** — "here's one night that fits" (lowest effort). From the For You card.
2. **Vote** — "the crew picks from 2–3" (for indecisive groups).
3. **From an item** — "Go together" on a specific movie/event (item already known).
(Power path: "Build by hand" — the when/vibe/budget form.)

The invitee has their own short path, covered at the end.

## Screen 1 — Compose
### 1a. Suggestion (/plans/starter)
Job: "Give me something good so I don't have to think." Anxieties: Is this right for us? Can I change it? What'll it cost? What if my friends hate it?
Show: the curated night (event + dinner + timing), per-head cost inside their budget band, one plain "why this" line. Crew is not assumed here — a quiet line says "you'll pick who's coming next."
Actions: primary white "Yes, plan it" → crew. Secondary "Another" (reshuffles in place). Tertiary "Let the crew vote instead" → 1b. Text link "Build a plan by hand" → the form.
### 1b. Vote (/plans/new, vote mode)
Job: "We can't agree — let the group choose." Show: when (chips), vibe, budget-a-head, and the lock rule — "Locks when N are in. Majority of who joined. No chasing." District builds 2–3 options. Action: primary "Create plan" → crew.
### 1c. From an item ("Go together" on a detail page)
The item is already chosen, so skip compose. Go straight to crew with the item pinned at the top.
Rule: all three create the plan and land on the same crew screen. None of them books anything yet.

## Screen 2 — Who's coming (/plans/[id]/crew)
Job: "Get my people in — fast." Show: editable "usual crew" row only if there's history, each with a checkbox, "Tap to include", never pre-selected silently. "Add someone" by name — no forced contact sync. "Share a link" as the hero — "anyone can join, no app needed." Reassurance: "They get one message. No spam." Empty state: lead with "Add a friend or share a link", WhatsApp front and centre.
Action: primary white "Send invite" → status. Disabled with a hint until at least one person is picked or the link is shared.

## Screen 3 — It fills, live (/plans/[id])
Job: "Tell me it's happening and that I'm not the one carrying it." Show: the night (or the 2–3 options with a live tally). Roster: In vs Pending, avatars, live. Lock progress: "3 of 5 in — locks at 4" as a bar. "Seats held 9:32". Your share: "You'll pay ₹X when it locks." "Nudge the pending" — one tap, the app sends the reminder, rate-limited. Persistent "Share on WhatsApp."
Auto: friends join over a few seconds (simulated); at the lock threshold it advances itself to confirmed. Edge — no quorum by expiry: "Not enough people this time" with "Nudge again" and "Pick a new night." Edge — option sells out: swap or flag; never lock a sold-out option.

## Screen 4 — You're out (/plans/[id]/confirmed)
Job: "Confirm it's real and done." Show: checklist — tickets booked, table reserved, bill split via Splitpay, ride (if included) — each person's amount, celebration. Actions: "Add to calendar", "Message the crew", "Done" → live plan card / Home. Trust: price at lock is price charged; any failure auto-refunds.

## Screen 5 — The live plan + re-plan (/plans/[id], "Your Plans")
Show: when / where / who / paid, calendar, directions, message-crew, final roster. Edge — drop after lock: re-split automatically, notify, plan holds. Retention: "Loved it? Plan the next one" → compose with the same crew pre-filled.

## The Invitee (/join/[id])
Job: "Say yes easily, know what I'm in for, don't get scammed, don't download anything." Show: the plan, who's already in, your share, "You won't be charged until it's locked." District branding + organiser name. Actions: primary "I'm in" — one tap, no download, no upfront payment. After lock → "Pay your share". Secondary "Can't make it".

## The rules
No download to say yes or pay. Commit free, pay on lock. The app nudges, not the organiser. Money always visible. Crew is chosen, never presumed. No dead ends (friendly recovery, never a redirect to Home). One brand.

## State model
Plan: draft → inviting → locking → confirmed → completed, plus cancelled, expired. Member: invited → in → paid → declined → dropped. Lock: majority of joined AND ≥ quorum → auto-lock. Payment: RSVP free; on lock each share settles via Splitpay; full refund on cancel.
Persistence (critical): plan + member state lives client-side (localStorage / persisted client store, keyed by plan id) so it survives Vercel's serverless statelessness. Seed one demo plan + crew so links always resolve.

## Build acceptance — every path works, verified on the live URL
1. Suggestion → Yes, plan it → crew → Send invite → it fills → locks → You're out → Done.
2. Suggestion → Let the crew vote → crew → status shows options + tally → locks → confirmed.
3. New plan (form) → Create plan → crew → … → confirmed.
4. "Go together" on an item → crew → … → confirmed.
5. Invitee opens the share link → sees the plan → "I'm in" → pays share → joined.
6. Every button on every /plans and /join page routes somewhere; unknown id shows the friendly recovery screen; nothing redirects to Home on error.
