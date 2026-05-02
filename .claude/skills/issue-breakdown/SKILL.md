---
name: issue-breakdown
description: Decompose APP_SPEC.md into a prioritized, dependency-ordered issue list saved as ISSUES.md. Invoke when the user runs /issue-breakdown or after the spec is final.
allowed-tools: Read, Write, Edit, Task
---

# Issue Breakdown

Generate a flat, dependency-ordered issue list from the spec. Coder agents pick up issues one at a time.

## Process

1. Confirm `APP_SPEC.md` exists.
2. Spawn the `issue-breakdown` subagent:

```
Task(
  subagent_type="issue-breakdown",
  description="Break APP_SPEC.md into ISSUES.md",
  prompt="Read APP_SPEC.md (and ARCHITECTURE.md / API_CONTRACTS.md if they exist). Produce ISSUES.md per your agent definition. Group by Setup, Data, API, UI, Polish, Tests, Deploy. Mark dependencies between issues with #N references."
)
```

3. Print summary: total issues, complexity distribution, critical path length.
