# Forge Principles

Durable principles every agent applies. The spec is sovereign — when a principle conflicts with the spec, the spec wins. When two principles conflict, the one earlier in this document wins (read: "the spec is sovereign" beats everything; "ship the thinnest real version" beats "make it elegant").

These are short on purpose. The expansions explain what the principle forbids in concrete terms — that's where they get teeth.

## Meta

1. **The spec is sovereign.** Every decision re-anchors to `APP_SPEC.md`. Conflict resolutions cite a verbatim span. A principle that contradicts the spec doesn't apply.
2. **Earlier principles beat later principles.** When two pull opposite directions, the higher-numbered one yields.
3. **Be specific, not aspirational.** "Be opinionated" without an opinion is no rule. If you can't say what a principle forbids, it isn't doing work.

## Product & scope

4. **MVP perfect before features.** The core user story works flawlessly before any secondary feature gets a single hour of attention. Forbids: shipping a half-complete signup flow because "we'll polish it after we add notifications".
5. **80/20.** 20% of features deliver 80% of the value. Identify those and double down on them. Forbids: equal time per feature regardless of impact.
6. **Ship the thinnest version that's still real.** A workout tracker that records and lists workouts is a product. One that records but doesn't list is a demo. Forbids: cutting so deeply that the result isn't usable.
7. **YAGNI.** Don't build for hypothetical future requirements. The cost of removing dead code later is much smaller than the cost of carrying it. Forbids: "we might need this someday" abstractions.
8. **The cost of a feature is forever.** Every feature adds maintenance, surface area, cognitive load. Default answer is "no"; "yes" needs justification tied to the spec.
9. **Out-of-scope is sacred.** The spec's "Out of Scope for V1" list is binding. New scope requires explicit user input via `.forge/state/notes.md`, never agent improvisation.
10. **Walk the happy path end-to-end before edge cases.** A working golden path with TODO edge cases beats a perfectly-edge-cased path that doesn't reach the end.

## Architecture

11. **Boring technology.** Default to the canonical Forge stack. A new library must justify itself in `BUILD_LOG.md` or `ARCHITECTURE.md` decision log. Forbids: adding a state-management library "to clean things up".
12. **Premature abstraction is the root of mediocrity.** Three similar files beat one leaky abstraction. Wait for the third real instance before extracting. Forbids: factoring out a shared component on its first use.
13. **Co-locate by feature, not by type.** `src/app/<feature>/` containing the route, components, and feature-specific server logic beats deep global folders. Forbids: a `components/` folder that grows linearly with features.
14. **Push state to the edges; keep the middle pure.** Side effects (DB, network, files) live at module boundaries. Pure logic in the middle. Forbids: a deeply-nested function that quietly hits the database.
15. **Single source of truth per concept.** Auth state in Clerk. User data in the DB. Don't shadow either with a parallel store. Forbids: a `useAuth()` hook that maintains its own user object.
16. **Make illegal states unrepresentable.** Discriminated unions over flag fields; `Result<T, E>` over `T | null`. Forbids: a `User` type with `isLoggedIn: boolean` and a nullable `id` — model `Anonymous | Authenticated`.
17. **Reversible decisions get made fast; irreversible decisions get made carefully.** Naming a private helper: fast. Choosing a database: slow. Forbids: belaboring small calls; rushing migrations.

## Coding

18. **Comments explain WHY, not WHAT.** If a comment merely re-describes the code, delete it. Forbids: `// increment counter` above `counter++`.
19. **Names earn their length.** Short locals (`i`, `u`), long globals (`computeSubscriptionRenewalDate`). A good name removes the need for a comment.
20. **Function arguments tell the story.** Five+ positional args = missing object. Boolean args = missing two functions. Forbids: `createUser(name, email, isAdmin, sendWelcome, skipValidation)`.
21. **Errors are values.** Catch at boundaries, log structured, return useful types. No bare `try/catch { return }`. Forbids: silent failures.
22. **The function does what its name says, no more.** `getUser` doesn't write to the DB. `saveUser` doesn't fetch. Forbids: side effects in named-action functions where the name doesn't imply them.
23. **Mutation is local; sharing is read-only.** Mutate inside a function body; never reach in and mutate someone else's state. Forbids: a hook that mutates a prop.
24. **Read the code before changing it.** Open the file, scan imports, find call sites. Three minutes of reading saves an hour of debugging. Forbids: editing a function based on its name alone.
25. **Tests describe behavior, not implementation.** A test should survive a refactor. Test the contract, not the function body. Forbids: tests that mock everything and assert nothing real happened.
26. **Logs answer questions a future you will ask.** "What happened in request abc-123?" is the bar. Structured fields beat string interpolation. Forbids: `console.log("here")`.

## Design

27. **Hierarchy first, decoration last.** If the user can't tell what to do at a glance, no font choice fixes it. Forbids: polishing typography on a screen with no clear primary action.
28. **Cut, don't add.** The strongest design move is removing something. When in doubt, delete. Forbids: solving a busy screen by adding "structure".
29. **Constraint over permission.** A tight palette and tight type scale produce consistency for free. Forbids: per-component color choices.
30. **The empty state is the most important state.** A user spends day one looking at empty more than full. Design it first. Forbids: shipping a list view without designing the empty case.
31. **Real content during design.** Lorem ipsum hides every problem. Use seed data that mirrors the actual domain. Forbids: designing a chat UI with "Hello world" messages.
32. **Mobile-first is a constraint, not a niceness.** Design at 375px first; desktop is a refinement. Forbids: shipping a 1280px-only design.
33. **Defaults are decisions.** Every form field's default value, every empty state's CTA, every loading state's tone is a choice. None of them get to be "whatever shadcn ships". Forbids: untouched shadcn aesthetics.
34. **Friction belongs at irreversible actions only.** "Are you sure?" on delete; never on save. Forbids: confirmation dialogs on reversible actions.
35. **Speed feels like quality.** Animate state changes; never abrupt. A smooth 100ms beats a janky 50ms. Forbids: layout shift on data load.
36. **Accessible by default.** Focus rings, contrast (≥ 4.5:1), keyboard nav, reduced-motion support. Not afterthoughts. Forbids: invisible focus states.
37. **The app icon is part of the design.** A great UI with a generic icon is unfinished. The home-screen icon must hold its own next to first-party Apple apps.

## Process

38. **One change at a time.** Big PRs hide small bugs. Small PRs surface them. Forbids: bundling a refactor with a feature.
39. **Root cause, not symptom.** A bug that recurs was never fixed; it was suppressed. Forbids: `try/catch` that swallows the error you couldn't reproduce.
40. **Optimize for the read.** Code is written once and read many times. Same with logs, comments, commits. Forbids: clever one-liners over readable five-liners.
41. **Document decisions, not facts.** "Why we chose Drizzle" matters in 6 months. "Drizzle is an ORM" doesn't. Forbids: comment blocks restating types.
42. **The blame is on the system, not the person.** When a bug reaches prod, ask "what process let this through?", not "who wrote this". Forbids: blame in retrospectives or commit messages.
43. **Hard floors are non-negotiable.** A loop that hits its cap below `floorVisualScore` or with failing tests fails the build. No "ship it anyway". Forbids: bypassing quality gates.

## How agents apply these

- **architect** — 11–17. Especially YAGNI (7), boring tech (11), premature abstraction (12).
- **coder** — 18–26. Plus 4 (MVP perfect) when picking up issues — finish the core path before edge cases.
- **designer** — 27–37. Plus 4–6 (cut scope before polishing).
- **ui-polish** — 33–36. Speed-feels-like-quality (35) is your north star; reduced-motion respect (36) is mandatory.
- **spec** — 4–10. Push back on vague personas; demand observable success criteria; out-of-scope ≥ 3 items.
- **issue-breakdown** — 4–10. Order by 80/20 impact, not alphabetical or topical.
- **debug** — 39 (root cause), 24 (read first), 21 (errors as values).
- **tester** — 25 (behavior over implementation), 4 (test the core path first, edge cases later).
- **visual-qa** — 27–37 are the rubric's substrate. Score against them.
- **retro** — encode violations as dated lessons in `<agent>.lessons.md`. Cross-reference principle numbers.
- **code-review** skill — every required-fix finding cites a principle by number.

## When in doubt

Read the spec. Quote it. Pick the option the spec most directly endorses. If the spec is silent, pick the option that respects the most principles, with earlier principles taking precedence.
