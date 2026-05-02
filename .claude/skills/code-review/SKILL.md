---
name: code-review
description: Architectural code review of recent changes against APP_SPEC.md, ARCHITECTURE.md, and Forge's coding rules. Reports issues without auto-fixing.
allowed-tools: Read, Bash, Glob, Grep
---

# Code Review

Review recent code changes for spec adherence, architectural fit, and Forge coding rules.

## Process

1. **Determine scope.** Default: `git diff main...HEAD`. If on `main`, last commit.
2. **Read** `APP_SPEC.md`, `ARCHITECTURE.md`, `API_CONTRACTS.md`.
3. **Audit the diff** against:

### Spec adherence
- Does each new feature trace to a user story? Cite the story.
- Does any new code add scope that's in the spec's "Out of Scope" list?

### Architecture adherence
- Does new code respect folder boundaries from `ARCHITECTURE.md`?
- Are new abstractions justified by `ARCHITECTURE.md`'s decision log?
- Are server actions used for in-app mutations and API routes for cross-origin/webhooks?

### Forge coding rules
- No `any`, no `@ts-ignore`, no `as` casts without justification comment.
- API routes use `src/lib/api-handler.ts` wrapper (not bare exports).
- Components have one-line JSDoc explaining purpose.
- No `console.log` outside `src/lib/logger.ts`.
- No hardcoded secrets or environment-dependent strings.
- No comments that re-describe the code.

### Security
- Auth checks present on every authed route.
- User input validated with zod.
- No direct DB queries from the client.
- No dangerous HTML rendering without sanitization.

## Output

A markdown report (don't write to a file unless asked, just print):

```markdown
# Code Review

## Spec adherence
- ✅ ... / ❌ ...

## Architecture
- ✅ ... / ❌ ...

## Coding rules
- ✅ ... / ❌ ...

## Security
- ✅ ... / ❌ ...

## Required fixes (must address before merge)
1. <file:line> — <what>

## Suggestions (non-blocking)
1. <file:line> — <what>
```

## Rules

- **Don't fix.** Report only. The user (or coder agent) decides what to do.
- **Cite sources.** Every blocker references the spec/architecture file + line, plus the offending code file + line.
- **Be specific.** "Refactor needed" is not a finding. "src/app/foo/page.tsx:42 mutates state inside render — extract to useEffect or server action" is.
