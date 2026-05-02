---
name: design-critique
description: Run multiple persona subagents in parallel against a design candidate and synthesize their feedback. Used in the Phase 2 design loop.
allowed-tools: Read, Write, Edit, Bash, Task
---

# Design Critique

Have each Target User persona react to a design candidate. Synthesize the feedback for the designer.

## Inputs

- A design candidate folder (or screenshot folder): `.forge/state/screenshots/<iteration>/`
- `APP_SPEC.md` (for the personas)

## Process

1. **Parse personas.** Read the Target Users section. Each named persona becomes a separate `persona` subagent.

2. **Spawn all personas in parallel** (single response with multiple Task calls):

```
For each persona P:
  Task(
    subagent_type="persona",
    description="P's first impression",
    prompt=<see template>
  )
```

3. **Collect all feedback files** from `.forge/state/persona-feedback-<slug>-<iteration>.md`.

4. **Synthesize.** Write `.forge/state/design-feedback-<iteration>.md`:

```markdown
# Design feedback synthesis — Iteration <n>

## Consensus
- <issues raised by 2+ personas>

## Persona-specific
- <issues raised by only one, but still important>

## What's working (consensus)
- ...

## Recommended next moves for the designer
1. ...
2. ...
```

## Persona prompt template

```
You are <persona name>: <persona description from APP_SPEC.md>.

The app's purpose: <One-Sentence Purpose>.

You are seeing a design candidate for the first time. Look at the screenshots in .forge/state/screenshots/<iteration>/. React as <persona name> would, in their voice.

You do NOT know:
- The designer's intent
- The "design vibe" the spec asked for
- Any prior feedback or scores

Write your reaction to .forge/state/persona-feedback-<your-slug>-<iteration>.md per your agent definition.
```

## Output

Return:
- Number of personas run
- Path to synthesis file
- Top 3 issues by consensus
