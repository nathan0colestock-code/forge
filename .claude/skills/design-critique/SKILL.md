---
name: design-critique
description: Run multiple persona subagents AND visual-qa in parallel against a design candidate, then synthesize their feedback. Used in the Phase 2 design loop.
allowed-tools: Read, Write, Edit, Bash, Task
---

# Design Critique

Get parallel reactions from each Target User persona AND a blind visual-QA score on the same iteration's screenshots. Synthesize into one feedback document.

## Inputs

- A design candidate folder with screenshots: `.forge/state/screenshots/<iteration>/`
- `.forge/state/spec.json` (for personas, purpose, target users)

## Process

1. **Capture screenshots** if not already done (`./scripts/screenshot.sh ...`).

2. **Spawn ALL agents in parallel** — single response with multiple Task calls. Personas + visual-qa share the same screenshots and produce independent outputs:

```
For each persona P from spec.json.targetUsers:
  Task(subagent_type="persona", description="P's first impression", prompt=<see persona template>)
Task(subagent_type="visual-qa", description="Score iteration <n>", prompt=<see visual-qa template>)
```

3. **Wait for all** to complete. Collect:
   - `.forge/state/persona-feedback-<slug>-<iteration>.md` per persona
   - `.forge/state/visual-qa-<iteration>.md` from visual-qa

4. **Synthesize** — write `.forge/state/design-feedback-<iteration>.md`:

```markdown
# Design feedback synthesis — Iteration <n>

Visual QA score: X/10 (target: Y, floor: Z)

## Consensus from personas
- <issues raised by 2+ personas>

## Persona-specific
- <issues raised by only one, but still important>

## Visual QA issues blocking a higher score
1. ...
2. ...

## What's working (consensus)
- ...

## Recommended next moves for the designer
1. ...
2. ...
```

## Persona prompt template

```
You are <persona name>: <persona description from spec.json>.

The app's purpose: <One-Sentence Purpose>.

You are seeing a design candidate for the first time. Look at the screenshots in .forge/state/screenshots/<iteration>/. React as <persona name> would, in their voice.

You do NOT know:
- The designer's intent
- The "design vibe" the spec asked for
- Any prior feedback or scores

Write your reaction to .forge/state/persona-feedback-<your-slug>-<iteration>.md per your agent definition.
```

## Visual-QA prompt template

See `visual-score/SKILL.md` — same template, same blindness rules. The orchestrator passes the right model (sonnet interim, opus final).

## Output

Return:
- Number of personas run
- Visual QA score
- Path to synthesis file
- Top 3 issues by combined consensus
