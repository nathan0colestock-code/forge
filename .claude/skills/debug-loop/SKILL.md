---
name: debug-loop
description: Drive the debug agent through a fix-and-retest cycle for failed Playwright tests, runtime errors, or broken UI states. Caps at 5 iterations.
allowed-tools: Read, Write, Edit, Bash, Task
---

# Debug Loop

Wrap the `debug` subagent in a controlled fix-and-retest loop.

## Inputs

- Failure source: Playwright report path, runtime log, or screenshot path
- Iteration cap: from `forge.config.json` → `qualityLoop.maxIterations` (default 5)

## Process

For iteration `i = 1..cap`:

1. **Read the latest failures.** Locate the failing test names + stack traces.
2. **Spawn the debug subagent:**

```
Task(
  subagent_type="debug",
  description="Fix failures — iteration <i>",
  prompt=<see template>
)
```

3. **Re-run tests** (`npx playwright test --reporter=line`).
4. **If green:** done. Return success.
5. **If still failing AND iteration < cap:** continue.
6. **If still failing AND iteration == cap:** write `.forge/state/debug-stuck-<n>.md` with the remaining failures and surface to the orchestrator.

## Subagent prompt template

```
Failures to fix (this iteration):
<list of test names + stack traces + screenshot paths>

Per your agent definition:
- Find root causes, not symptoms
- Query Better Stack with BETTERSTACK_API_TOKEN if helpful
- Document each fix in BUGS.md
- Run only the failing tests after each fix; full suite at the end

Project root: <pwd>
```

## Output

Return:
- Iterations used
- Final test status
- Bugs documented (count)
- Stuck failures (paths to .forge/state/debug-stuck-*.md)
