---
name: spec-interview
description: Extract a complete APP_SPEC.md from a raw voice memo or brain dump. Invoke when the user pastes a transcript and says "extract spec", "create spec", or runs /spec-interview. Delegates to the spec subagent.
allowed-tools: Read, Write, Edit, Bash, Task, AskUserQuestion
---

# Spec Interview

Turn the user's raw input (voice memo transcript or brain dump) into a complete `APP_SPEC.md`.

## Inputs

The user has either:
- Pasted the transcript directly into the conversation, OR
- Saved it to `.forge/transcripts/<file>.txt` and referenced it

Find the transcript. If unclear which file, ask which one.

## Process

1. **Save the transcript** if not already saved: `.forge/transcripts/<ISO-timestamp>.txt`.
2. **Spawn the spec subagent** via Task:

```
Task(
  subagent_type="spec",
  description="Extract APP_SPEC.md from transcript",
  prompt=<see template below>
)
```

3. The spec agent will produce `APP_SPEC.md` and ask the user any unresolved questions.
4. **Show the user the result.** Print:
   - One-Sentence Purpose
   - Personas list
   - Any `[ASSUMED]` flags that survived
   - The path: `APP_SPEC.md`
5. Tell the user: "Review the spec. Edit anything you want. When ready, say `go` or run `/forge-build`."

## Subagent prompt template

```
Read the transcript at <path>. Read SPEC_TEMPLATE.md for the field structure.

Fill in every field you can confidently infer. For ambiguous fields, choose a reasonable default and flag inline as [ASSUMED: <reason>]. Identify only the questions you genuinely cannot answer from the transcript or sensible defaults, and ask them all in a single AskUserQuestion call (never one at a time).

Apply the answers, remove confirmed [ASSUMED] flags, and write APP_SPEC.md to the project root.

Per your agent definition: Target Users must be distinct named personas. Success Criteria must be observable. Out of Scope must have ≥ 3 items.
```
