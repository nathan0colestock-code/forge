# App Spec: [App Name]

> The source of truth for this app. Every Forge agent re-anchors to this document when resolving conflicts. Be specific. Vague specs produce mediocre apps.

## One-Sentence Purpose
What does this app do, in one sentence? Written as a user benefit.

## Problem Being Solved
What pain point or gap does this address? Who feels it?

## Target Users
Who are the primary users? Describe them concretely (not "anyone"). Each persona named here becomes a user-testing subagent in the design loop.

- **[Persona name]** — concrete description, what they want, what frustrates them.
- **[Persona name]** — ...

## Core User Stories
List the 5–10 things a user must be able to do. Format:
- As a **[user]**, I can **[action]** so that **[outcome]**.

## Key Screens / Views
List every distinct screen or major UI state.

## Data Model (rough)
Main entities, their key fields, and relationships. The data-model agent will formalize this.

## Authentication
- Required: yes / no
- Type: email/password, OAuth (which providers?), magic link, none

## Integrations
External services, APIs, or data sources beyond the canonical Forge stack.

## PWA Requirements
- Offline support: yes / no — for which views?
- Installable: yes (always) / describe special install behavior
- Push notifications: yes / no

## Brand & App Icon
Every Forge app ships a real, professional brand mark that doubles as the iPhone home-screen icon. Fill these or accept the spec agent's `[ASSUMED]` defaults.

- **Brand name (display):** the name as it should appear on the home screen (≤ 12 chars works best on iOS)
- **Logo concept (1–2 sentences):** what the mark depicts and why. e.g. "A single hand-drawn arc, off-center, evoking momentum without speed."
- **Icon style:** glyph-only / monogram / abstract mark / illustrative
- **Primary brand color:** name + hex, e.g. "warm coral, #FF6B5C"
- **Secondary / accent color:** optional
- **Tone / feel:** 3–5 adjectives, e.g. "editorial, calm, confident, monochrome, considered"
- **Inspirations / anti-inspirations:** "feels like Linear's icon, NOT like a generic SaaS gradient blob"

The designer agent uses these to render a brand mark and then `npm run icons:generate` produces every required size (180, 192, 512, maskable 512) plus the favicon and apple-touch-icon.

## Design Vibe
The aesthetic in plain language. Reference apps, adjectives, colors, moods. What it should feel like — and what it should absolutely NOT feel like.

## Success Criteria
3–5 concrete, observable things that must be true for v1 to be done. At least one must address visual quality (e.g. "Visual QA score ≥ 8 on every key screen, app icon recognizable at 60×60").

## Out of Scope for V1
Things that are tempting but should NOT be built yet.

---

> The raw transcript or brain-dump that this spec was extracted from lives at `.forge/transcripts/`, not in this file. Keep this document clean.
