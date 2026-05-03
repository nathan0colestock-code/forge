---
name: forge-issue
description: File a properly-formatted Forge GitHub issue from inside Claude Code. Asks the user the minimum questions, applies the right labels, and lets the watcher pick it up if marked forge:auto.
allowed-tools: Read, Bash, AskUserQuestion
---

# Forge Issue

Quick path for the user to file a well-formed issue without leaving Claude Code.

## Process

1. **Determine repo.** Use `gh repo view --json nameWithOwner -q .nameWithOwner` from the current directory. If not in a GitHub repo, abort.

2. **Ask the user (one batched `AskUserQuestion` call):**
   - Title (free text, no header — they type the title only)
   - Type: bug / feature / polish / debt / design / infra
   - Priority: p1 / p2 / p3
   - Auto-pickup: yes (add `forge:auto`) / no (human triage)
   - Body: free text — they describe the problem and acceptance criteria. The skill formats it into the standard template.

3. **Infer the agent label** from type:
   - `bug` → `forge:agent=debug` (default; user can override)
   - `feature` or `debt` → `forge:agent=coder`
   - `polish` → `forge:agent=ui-polish`
   - `design` → `forge:agent=designer`
   - `infra` → `forge:agent=infra`

   If type is `bug` and the user provided a stack trace or test failure, default agent stays `debug`. Otherwise allow override via a second narrow question if the inference seems wrong.

4. **Compose the issue body** in the template from `LABELS.md`:

```markdown
## Acceptance criteria
<from user input — split bullet points if they wrote a paragraph>

## Context
<from user input — what they typed for "why">

## Suggested approach
<if user provided one>

## Forge metadata
- **Source:** user
- **Source build:** <current git SHA via `git rev-parse --short HEAD`>
- **Related files:** <if user mentioned any>
```

5. **Create the issue:**

```bash
gh issue create \
  --title "<title>" \
  --body "<composed body>" \
  --label "forge:type=<type>,forge:agent=<agent>,forge:priority=<priority>" \
  $(if [[ "$AUTO" == "yes" ]]; then echo "--label forge:auto"; fi)
```

6. **Print the result:** issue number and URL. If `forge:auto` was applied, mention that the watcher will pick it up on its next pass.

## Rules

- **Don't ask about agent unless the inference is ambiguous.** Most issues map cleanly from type → agent.
- **Never file an issue without acceptance criteria.** If the user didn't include any, ask one follow-up question for them.
- **Don't auto-pick `forge:auto` for `forge:type=bug` with priority p1** without user confirmation — those go to humans first.
