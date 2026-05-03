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

## Design Vibe
The aesthetic in plain language. Reference apps, adjectives, colors, moods. What it should feel like — and what it should absolutely NOT feel like.

## Responsive & Theme Requirements
All Forge apps must satisfy these non-negotiable baselines — no exceptions, no spec override needed:

- **Responsive**: fully usable on mobile (≥ 375 px), tablet, and desktop. Touch targets ≥ 44 px. No horizontal scroll.
- **Light & dark mode**: every screen must look polished in both modes. Dark tokens are defined in `globals.css`; the designer agent must supply matching values for both.
- **System-adaptive**: defaults to the user's OS preference (`prefers-color-scheme`) via `next-themes` (`defaultTheme: "system"`). Manual toggle is optional but system default is required.
- **No hardcoded colors**: all color values go through CSS custom properties (`var(--bg)`, `var(--fg)`, etc.) so theme switching is seamless.

## Success Criteria
3–5 concrete, observable things that must be true for v1 to be done.

## Out of Scope for V1
Things that are tempting but should NOT be built yet.

---

> The raw transcript or brain-dump that this spec was extracted from lives at `.forge/transcripts/`, not in this file. Keep this document clean.
