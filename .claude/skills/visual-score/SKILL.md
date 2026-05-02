---
name: visual-score
description: Capture screenshots of the running app on desktop/mobile/tablet and score them blindly via the visual-qa subagent. Used by the design loop and quality loop. Returns a score 0-10 and actionable feedback.
allowed-tools: Read, Write, Edit, Bash, Task
---

# Visual Score

Capture screenshots, then have the `visual-qa` subagent score them blindly.

## Process

1. **Determine target URL.** If invoked during Phase 2 (design loop) or Phase 4 (quality loop), use `http://localhost:3000` (start dev server if not running). If invoked during Phase 5 (post-deploy), use the live Fly URL.

2. **Determine which screens to capture.** Read `APP_SPEC.md`'s Key Screens section. Map each to a route. Add `/` as a fallback.

3. **Run the screenshot helper:**
   ```bash
   ./scripts/screenshot.sh <base-url> .forge/state/screenshots/<iteration>/
   ```
   This captures every Key Screen at desktop (1280×800), mobile (375×812), and tablet (768×1024) viewports.

4. **Spawn the visual-qa subagent:**

```
Task(
  subagent_type="visual-qa",
  description="Score visual quality — iteration <n>",
  prompt=<see template below>
)
```

5. **Read the score** from `.forge/state/visual-qa-<iteration>.md`. Return it to the caller.

## Subagent prompt template

Pass to visual-qa:

```
Screenshots: .forge/state/screenshots/<iteration>/

App context (LIMITED — do not search beyond this):
- One-Sentence Purpose: <from APP_SPEC.md>
- Target Users:
<copy ONLY the Target Users section verbatim>

You are blind to the design rationale, design vibe, prior scores, designer notes, and tokens. Do not read any file outside the screenshots directory and the context above.

Score per the rubric in your agent definition. Write to .forge/state/visual-qa-<iteration>.md.
```

The "blindness" is enforced by what we pass — visual-qa's tool list intentionally excludes Glob/Grep so it can't search.

## Output

Return to the caller:
- Score (0-10)
- Pass/fail vs threshold (8)
- Path to the full report
