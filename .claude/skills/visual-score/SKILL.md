---
name: visual-score
description: Capture screenshots of the running app on desktop/mobile/tablet and score them blindly via the visual-qa subagent. Used by the design loop and quality loop. Returns a score 0-10 and actionable feedback.
allowed-tools: Read, Write, Edit, Bash, Task
---

# Visual Score

Capture screenshots, then have the `visual-qa` subagent score them blindly.

## Process

1. **Determine target URL.** If invoked during Phase 2 (design loop) or Phase 4 (quality loop), use `http://localhost:3000` (start the **built** app — `npm run build && npm run start` — if not running). For Phase 5 (post-deploy), use the live Fly URL.

2. **Determine which screens to capture.** Read `.forge/state/spec.json` `keyScreens[].route`. Add `/` as a fallback.

3. **Run the screenshot helper:**
   ```bash
   FORGE_SCREENSHOT_ROUTES="/,$(jq -r '.keyScreens[].route' .forge/state/spec.json | paste -sd,)" \
     ./scripts/screenshot.sh <base-url> .forge/state/screenshots/<iteration>/
   ```
   This captures every Key Screen at desktop (1280×800), mobile (375×812), and tablet (768×1024) viewports IN PARALLEL.

4. **For final iterations** (Phase 4.3 and Phase 5.2), also copy `public/apple-touch-icon.png` into `.forge/state/screenshots/<iteration>/icon/apple-touch-icon.png` so visual-qa can score the app icon.

5. **Spawn the visual-qa subagent.** The model used depends on iteration:
   - Interim (design loop iter < final, quality loop iter < final): `models.visualQa` (default sonnet)
   - Final iteration (design loop final, quality loop final, Phase 5.2): `models.visualQaFinal` (default opus)

```
Task(
  subagent_type="visual-qa",
  description="Score visual quality — iteration <n>",
  prompt=<see template below>
)
```

6. **Read the score** from `.forge/state/visual-qa-<iteration>.md`. Return it to the caller.

## Subagent prompt template

Pass to visual-qa:

```
Screenshots: .forge/state/screenshots/<iteration>/

App context (LIMITED — your tools cannot fetch more):
- One-Sentence Purpose: <inline from spec.json.purpose>
- Target Users:
<inline ONLY the targetUsers array, names + descriptions>

<if final iteration:>
- App icon location: .forge/state/screenshots/<iteration>/icon/apple-touch-icon.png
- Apply the bonus "App icon" criterion (see your agent definition).

You are blind to the design rationale, design vibe, prior scores, designer notes, and tokens. Your tool list (Glob, Write only) prevents reading other repo files — do not try.

Score per the rubric in your agent definition. Write to .forge/state/visual-qa-<iteration>.md.
```

## Output

Return to the caller:
- Score (0-10)
- Pass/fail vs `minVisualScore`
- Pass/fail vs `floorVisualScore`
- Path to the full report
