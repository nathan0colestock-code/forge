# App Spec: Comms

> The source of truth for this app. Every Forge agent re-anchors to this document when resolving conflicts. Be specific. Vague specs produce mediocre apps.

## One-Sentence Purpose
A keyboard-driven unified inbox and pastoral-care workflow engine that lets a single pastor triage every channel of communication (Gmail, iMessage, Signal, SMS, calls), reference threads against people/scripture/commitments, and run multi-stage follow-up workflows from one fast surface.

## Problem Being Solved
A working pastor's communication is fragmented across four channels (email, iMessage, Signal, SMS) with very different rhythms, plus a constant background obligation to follow up with visitors, members in pastoral care, and meeting prep. Existing inboxes treat each channel in isolation, have no concept of "who is this person and what have we promised them," and cannot drive multi-stage time-and-touch sequences (thanks-for-visiting → coffee invite → small-group info). The pain is felt by Nathan specifically: 231k+ historical messages already exist, time-sensitive workflow drafts get missed, and there is no shared reference layer between communication threads and the bulletproof people/commitments/scripture data already maintained in CSV.

## Target Users
This is an explicitly single-tenant app for one pastor. To produce sharp design feedback, the spec names the distinct hats Nathan wears throughout a week — each becomes a user-testing persona.

- **Nathan-as-Triager (weekday morning)** — clears 50–200 messages across four channels in 20 minutes before his first meeting. Lives on `j/k/e/r/w`. Frustrated by anything that takes a hand off the keyboard, by drafts that aged past their useful window, and by needing to remember which account a message came in on.
- **Nathan-as-Pastor (mid-week, pastoral care)** — sitting with a person's history open, references a scripture and a prior commitment into a thread, advances a workflow stage manually because "they came to small group on Sunday." Wants the person view to be the center of gravity, not the inbox. Frustrated when context is buried in three apps.
- **Nathan-as-Mobile-Responder (between meetings, on phone)** — gets pinged about a visiting family at a community event, advances `new-visitor` to stage 3 from his phone in under 30 seconds. Frustrated by web UIs that assume desktop, by tap targets under 44 px, and by anything that requires the Mac to be reachable to make progress.
- **Nathan-as-Searcher (sermon prep, late night)** — searches `ref:Andy ref:Romans-8` to pull every thread that touched Andy and Romans 8 across two years and four channels. Frustrated by slow search, by Gmail's "did you mean," and by losing context when a quote came from iMessage instead of email.
- **Nathan-as-Operator (occasional, evenings)** — edits a YAML workflow, reloads templates, checks that the Mac helper daemon is online, glances at the workflow tick log. Frustrated by opaque background systems and by needing to redeploy to change a template.

## Core User Stories
- As **Nathan-as-Triager**, I can open one keyboard-driven inbox view filtered by channel (All / Email / iMessage / Signal / SMS / Calls) so that I can clear every channel without context-switching between apps.
- As **Nathan-as-Triager**, I can see a "Pending Review" badge with workflow-generated drafts at the top of the inbox so that time-sensitive scheduled drafts never sit past their window.
- As **Nathan-as-Triager**, I can hit `r` on any thread and tag it with `person`, `scripture`, `commitment`, `topic`, `meeting`, or `project` references so that the thread becomes findable and joinable against bulletproof CSVs.
- As **Nathan-as-Pastor**, I can start a named workflow (e.g. `new-visitor`) on a person and have it auto-draft each stage into Pending Review with the right channel, account, and template so that pastoral follow-up runs on rails without me remembering it.
- As **Nathan-as-Pastor**, I can advance, pause, or resume any person's workflow stage manually from the person view so that real-life events ("they came Sunday") can drive the cadence.
- As **Nathan-as-Mobile-Responder**, I can use Comms on my phone in a fully responsive web UI so that I can advance workflows and approve drafts between meetings without a separate native app.
- As **Nathan-as-Searcher**, I can issue free-text and operator queries (`from:`, `to:`, `account:`, `channel:`, `ref:`, `before:`, `after:`, `has:attachment`, `label:`, `in:pending-review`) against a SQLite FTS5 index of subject + body + sender + recipients + attachment text so that p50 search latency is under 50 ms over 250k+ rows.
- As **Nathan-as-Triager**, I can compose a message with channel-and-account aware defaults (replying to ctk.com → `pastor@ctk`, replying to iMessage → iMessage, fresh compose follows a per-area default account configured in Settings with a global fallback) so that I never accidentally send from the wrong identity.
- As **Nathan-as-Operator**, I can configure default sending accounts per area (e.g. `area=ctk → pastor@ctk`) and a global fallback in the Settings page so that compose logic never hardcodes per-person identity rules.
- As **Nathan-as-Triager**, I can send Gmail messages directly from the server and queue iMessage/Signal sends to my Mac helper daemon (with a clear "Mac helper offline" banner if it can't reach me) so that all four channels are sendable from one UI.
- As **Nathan-as-Operator**, I can edit a workflow YAML or Jinja template on disk and have the workflow engine reload it so that I can iterate on cadence and copy without redeploying.
- As **Nathan-as-Searcher**, I can save searches to the left rail and re-run them with one keystroke so that recurring questions ("47 days no contact with Tom") become one-tap.
- As **Nathan-as-Triager**, I can migrate the existing 231k-row `data/messages.csv` into Comms on day one and have search and references work against full history immediately so that the app is useful from minute one rather than after months of ingestion.

## Key Screens / Views
- **Inbox (3-pane keyboard layout)** — left rail (accounts, saved searches, channel filters), middle (thread list with channel icons, ref chips, unread state, workflow tags), right (reader with thread, refs, workflow state, quick actions).
- **Pending Review queue** — filtered inbox view showing only workflow-generated drafts, sorted by scheduled-for time, with `[workflow → stage]` tags and one-keystroke approve/edit/snooze.
- **Compose modal** — channel + account selector first, then channel-adapted fields (email gets subject/recipients/signature/send-later; iMessage/Signal get contact-or-group picker, no subject, no signature). Slash-command template insertion. 5-second autosave.
- **Reference picker** — modal triggered by `r`, two fields (ref_type, ref_value), autocomplete sourced from `data/people.csv`, commitments timeline, `data/scripture_refs.csv`.
- **Person view** — header with name/area/last-contact, tabs for Threads (every thread referencing this person across all channels), Workflows (active stages, advance/pause buttons), Commitments, Notes. Mobile-optimized layout.
- **Search results** — same 3-pane shape but middle column lists matching threads with snippet highlights; supports operator chips and saved-search-from-here.
- **Workflows admin** — list of loaded YAML workflows, last-loaded timestamp, validation errors, reload button, log of recent ticks.
- **System status banner / page** — Mac helper online state, last heartbeat, Gmail OAuth health per account, signal-cli linked status, last successful Litestream backup.
- **Settings** — accounts (add/remove Gmail), signatures, per-area default-account rules (e.g. `area=ctk → pastor@ctk`) with a global fallback for fresh-compose, keyboard shortcut reference, theme toggle, Mac helper token issuance.

## Data Model (rough)
One SQLite database (`comms.db`) on a Fly.io persistent volume, FTS5 virtual table over message text, Litestream replicating to S3.

- **accounts** `(id, channel, address, oauth_json, active)` — every Gmail address, the iMessage handle, the Signal number.
- **messages** `(id, account_id, channel, channel_thread_id, direction, sent_at, subject, body, body_html, participants_json, attachments_json, raw_headers_json)` — one row per message across all channels; the existing 231k CSV rows import here on day one.
- **threads** `(id, channel, account_id, participants_hash, subject, last_message_at, last_message_id, unread_count, labels_json)` — channel-native threads; cross-channel conversations are NOT merged — they are linked via shared refs.
- **thread_refs** `(thread_id, ref_type, ref_value, added_at, note)` — the reference layer. Mirrored nightly to `data/thread_refs.csv` so bulletproof skills can join against it.
- **workflows** `(name, yaml_path, version, last_loaded_at)` — registry of loaded YAML workflow definitions.
- **person_workflow_state** `(person, workflow, current_stage, entered_at, history_json, paused)` — per-person workflow position; supports time-triggered, manual, and paused transitions. Default sending account is resolved at draft time from the Settings per-area rules + global fallback, not stored per-person.
- **settings_account_defaults** `(area, account_id)` plus a singleton `global_fallback_account_id` — per-area default-sending-account rules edited from the Settings page; consulted by compose logic and the workflow draft generator.
- **send_tasks** `(id, channel, account_id, to_json, subject, body, scheduled_for, status, approved_at, executed_at, error, workflow_ref_json)` — outbound queue. **Approval is always required**; no row transitions to `status=sending` without an explicit user approval action. Once approved, Gmail tasks execute server-side and iMessage/Signal tasks are consumed by the Mac helper over websocket. `scheduled_for` is a post-approval scheduling aid (a draft approved at 6 am with a 9 am send window will hold until 9 am); it is never an auto-send bypass.
- **fts_messages** (FTS5 virtual table) over `messages.subject + body + participants + attachments_text`.

Workflow YAML lives at `data/comms/workflows/<name>.yaml`; templates at `data/comms/templates/<workflow>/<step>.md` with Jinja vars resolved from `data/people.csv` and `data/meetings.csv`.

## Authentication
- Required: yes
- Type: Single-user. Primary login is Google OAuth restricted to `nathan0colestock@gmail.com` and `pastor@ctk.com` (only allowlisted Google identities can sign in). Gmail account ingestion uses separate per-account OAuth grants stored in `accounts.oauth_json`. Mac helper authenticates to the server with a long-lived signed token issued from the settings screen and presented over the websocket connection. [ASSUMED: single-user app per transcript scope; Google OAuth chosen because every account already in scope is a Google identity.]

## Integrations
- **Gmail API** — read and send for every linked Gmail account, server-side on Fly.io.
- **iMessage** — full send-and-receive in v0.5: read by tailing `~/Library/Messages/chat.db` from the Mac helper; send via AppleScript driven by approved `send_tasks` consumed over the helper websocket.
- **Signal** — full send-and-receive in v0.5: `signal-cli` linked-device listener for receive; `signal-cli send` for outbound. Mac helper owns both.
- **SMS / Calls** — read-only ingestion via the same `~/Library/Messages` and macOS call log paths the Mac helper already has access to. No outbound SMS in v1.
- **bulletproof CSVs** — `data/people.csv`, `data/scripture_refs.csv`, `data/meetings.csv`, `data/commitments.csv` read for autocomplete and Jinja vars; `data/thread_refs.csv` and `data/messages.csv` written nightly so existing bulletproof skills keep working.
- **Litestream** — continuous replication of `comms.db` to S3 for backup.
- **Mac helper daemon** — Python LaunchAgent on Nathan's Mac, websocket to the Fly app, 30 s heartbeat. Two responsibilities: tail iMessage/Signal/SMS deltas and consume `send_tasks`.

## PWA Requirements
- Offline support: yes — read-only access to inbox, threads, person views, and search results that were loaded while online; outbound actions (send, advance workflow, add ref) queue and replay when reconnected. [ASSUMED: pastoral mobile use frequently happens in patchy connectivity at events and hospital visits; offline-read of recent threads is high-value and inexpensive given SQLite-shaped data.]
- Installable: yes (always) — installable to home screen on iOS and macOS; meets all standard PWA install criteria (manifest, icons, service worker).
- Push notifications: yes — for newly arrived workflow drafts in Pending Review, for Mac-helper-offline alerts, and for high-signal threads (key relationships flagged in `people.csv`). Web Push via VAPID. Quiet hours configurable.

## Design Vibe
Linear meets Superhuman meets a terminal. Dense, fast, keyboard-first, monospace where it earns its keep (search operators, workflow YAML preview, message headers), proportional everywhere else. The visual language should feel like a tool a serious operator lives in for hours — minimal chrome, generous use of subtle dividers and weight rather than color, every surface answering "what can I press right now." Channel identity is shown via small, calm icons and a single accent dot, never via heavy color blocks. Workflow tags are pill-shaped, monochrome by default, with one accent color reserved for "needs your attention now."

It should NOT feel like Gmail (cluttered toolbars, mouse-first, color-coded labels everywhere), NOT feel like a church/ministry product (warm gradients, stock photography, scripture-themed flourishes), and NOT feel like Slack (notification anxiety, presence dots, channel sprawl). The app's character is quiet, fast, and trustworthy — a calm surface for a noisy job.

## Responsive & Theme Requirements
All Forge apps must satisfy these non-negotiable baselines — no exceptions, no spec override needed:

- **Responsive**: fully usable on mobile (≥ 375 px), tablet, and desktop. Touch targets ≥ 44 px. No horizontal scroll. The 3-pane desktop layout collapses to a single-column stack with back-navigation on mobile; person view is mobile-first because Nathan-as-Mobile-Responder lives there.
- **Light & dark mode**: every screen must look polished in both modes. Dark tokens are defined in `globals.css`; the designer agent must supply matching values for both.
- **System-adaptive**: defaults to the user's OS preference (`prefers-color-scheme`) via `next-themes` (`defaultTheme: "system"`). Manual toggle is optional but system default is required.
- **No hardcoded colors**: all color values go through CSS custom properties (`var(--bg)`, `var(--fg)`, etc.) so theme switching is seamless.

## Success Criteria
1. **Day-one history works.** All 231k existing rows from `data/messages.csv` import into `messages` and are searchable via FTS5 within the first deploy; `bin/sync_email.py` continues running in parallel until parity is proven; nightly CSV mirror of `thread_refs` is written so existing bulletproof skills do not break.
2. **Triage in 20 minutes.** Nathan can open the app cold, clear an inbox of 100 mixed-channel messages using only `j/k/e/r/w/c/gs`, and finish in under 20 minutes — measured by inbox-to-zero timing on a real morning, with zero hand-off-keyboard events for archive/reference/workflow-advance.
3. **End-to-end `new-visitor` workflow.** A workflow started from a person view fires stage 1 (email draft) into Pending Review immediately, stage 2 (iMessage draft, v0.5+) 7 days later, and stage 3 (email draft) on manual advance — each draft tagged `[new-visitor → stage N]`, sent from the account resolved by Settings per-area rules + global fallback, never auto-fired (always awaiting user approval), and once approved respecting any per-step `scheduled_for` window. All three stages are visible in the person's workflow history.
4. **Search is fast.** p50 search latency under 50 ms and p95 under 200 ms over a 250k-row corpus, measured against the production `comms.db` on Fly.io, for both free-text and operator queries.
5. **Reference round-trip.** Adding `person:Andy Stanley` and `scripture:Romans 8` to a thread via the `r` picker (a) makes `ref:Andy ref:Romans-8` return that thread in search within one tick, and (b) writes a row to `data/thread_refs.csv` on the nightly mirror that an existing bulletproof skill can join against.
6. **Mac helper resilience.** When the Mac helper is offline, the UI shows the offline banner with the queued send-task count within 60 seconds of last heartbeat; when it reconnects, all queued iMessage/Signal sends fire in order with status reported back into `send_tasks`.

## Out of Scope for V1
- Multi-user, delegate, or staff-shared access of any kind.
- Calendar integration beyond the `meeting-prep` workflow's day-before email.
- Analytics, dashboards, or reporting (volume, response time, workflow conversion, etc.).
- Cross-channel thread merging into a single conversation view (refs link them; data stays separate).
- Outbound SMS sending (SMS is read-only; reply-by-iMessage is the path).
- Attachment OCR for PDFs and docx in search (call out as v0.5 stretch; not v1).
- A separate native iOS or macOS client (mobile-responsive PWA covers v1).
- AI-generated draft bodies beyond Jinja template rendering (no LLM compose in v1).
- Snooze and send-later UI surfaces beyond the workflow engine's own scheduled windows (workflow scheduler covers the cadence need; ad-hoc snooze is v1 stretch).
- Pastoral-care nudges based on silence ("Tom Dodds — 47 days no contact") — defer to v1 stretch / post-launch.
- Importing or replacing any non-comms bulletproof skill; bulletproof remains the system of record for people, commitments, scripture, meetings.
- Auto-sending of any kind. Every outbound message — workflow-generated or hand-composed — requires explicit user approval; there is no `auto_send: true` flag.

## Tech Stack
Standard Forge pipeline stack, deployed from this repository (`/Users/nathancolestock/Waypoint`) — not a separate repo and not nested under `bulletproof/comms/`.

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS, with `next-themes` for light/dark/system.
- **API layer:** tRPC for typed client/server contracts; server actions where they fit.
- **Database:** SQLite (`comms.db`) on a Fly.io persistent volume; FTS5 virtual table over message text; Litestream → S3 for continuous backup.
- **Auth:** Google OAuth (allowlisted identities) for the operator login; per-Gmail-account OAuth grants for ingestion; signed long-lived token for the Mac helper websocket.
- **Background work:** server-side workers for Gmail ingest, send-task execution, workflow ticks, and nightly CSV mirror.
- **Mac helper:** Python LaunchAgent on Nathan's Mac, websocket client to the Fly app, owns iMessage/Signal/SMS read paths and iMessage/Signal send paths.
- **Hosting:** Fly.io for the web app, with a custom domain provisioned via the Forge deploy pipeline's `--domain` flag.

---

> The raw transcript or brain-dump that this spec was extracted from lives at `.forge/transcripts/`, not in this file. Keep this document clean.
