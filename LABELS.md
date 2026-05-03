# Forge Issue Conventions

GitHub Issues are the substrate Forge agents use for **continuous improvement**. After a build, agents file issues for things they noticed but didn't fix; a watcher routes actionable issues back to the right agent for follow-up work.

## Label taxonomy

Every Forge issue carries at least three labels: a **type**, an **agent**, and a **priority**. The optional `forge:auto` label authorizes automatic pickup by the issue watcher.

### Type (one)
| Label | Meaning |
|---|---|
| `forge:type=bug` | A defect — something is broken or incorrect |
| `forge:type=feature` | A new capability not yet built |
| `forge:type=polish` | Visual/UX refinement (came up below the visual-QA cap) |
| `forge:type=debt` | Code quality / refactor / test coverage |
| `forge:type=design` | Design direction or token revision |
| `forge:type=infra` | Deploy, CI, or environment work |

### Agent (one — the agent best-equipped to do the work)
| Label | Routes to |
|---|---|
| `forge:agent=coder` | `coder` subagent |
| `forge:agent=designer` | `designer` subagent |
| `forge:agent=ui-polish` | `ui-polish` subagent |
| `forge:agent=tester` | `tester` subagent |
| `forge:agent=debug` | `debug` subagent |
| `forge:agent=infra` | `infra` subagent |

### Priority (one)
| Label | Meaning |
|---|---|
| `forge:priority=p1` | Blocks normal use; ship the fix ASAP |
| `forge:priority=p2` | Important but not blocking |
| `forge:priority=p3` | Nice to have, defer is fine |

### Authorization (optional)
| Label | Effect |
|---|---|
| `forge:auto` | Watcher will pick up this issue automatically when capacity is available, implement, open a PR. Without this label, the watcher leaves the issue alone (human triage required). |

### Status (managed by the watcher — don't apply by hand)
| Label | Set when |
|---|---|
| `forge:in-progress` | Watcher has spawned a subagent to work on this issue |
| `forge:pr-open` | A PR has been opened that closes this issue |
| `forge:blocked` | Watcher attempted but couldn't make progress; awaits human input |

## Issue body template

The body MUST include these sections so subagents can parse it:

```markdown
## Acceptance criteria
- A short, observable bullet
- Another short, observable bullet

## Context
<one or two sentences explaining where this came from — a build, a user report, a retrospection>

## Suggested approach (optional)
<if the filing agent has a hypothesis>

## Forge metadata
- **Source:** retro | debug | visual-qa | tester | user
- **Source build:** <git SHA or build timestamp, if applicable>
- **Related files:** <comma-separated paths>
- **Related lessons:** <paths under .claude/agents/*.lessons.md, if any>
```

## Who files what

| Filing agent | Common types | Examples |
|---|---|---|
| `retro` | `polish`, `debt`, `design`, `feature` | "Visual QA capped at 7.8 — hierarchy on /dashboard", "Architect → datamodel handoff has been weak across 3 builds" |
| `debug` | `bug`, `debt` | Tech debt found while fixing a primary bug, but out of the bug's scope |
| `visual-qa` | `polish`, `design` | Specific items keeping score below 10 |
| `tester` | `debt` | Missing test coverage for an acceptance criterion |
| User | anything | Manually filed via `/forge-issue` or directly on GitHub |

## Watcher behavior

The `forge-watch` skill polls open issues every N minutes (default 30, override in `forge.config.json` → `watcher.intervalMin`). Pickup rules:

1. Issue must have `forge:auto` label.
2. Issue must NOT have `forge:in-progress` or `forge:pr-open` (already handled).
3. Issue must NOT be assigned to a human (human triage takes precedence).
4. Issue must have all three required labels (`forge:type=*`, `forge:agent=*`, `forge:priority=*`).
5. p1 > p2 > p3. Within a priority, oldest first.

When a pickup happens:
- Watcher applies `forge:in-progress`
- Watcher creates a branch `claude/issue-<N>` from `main`
- Watcher spawns the `forge:agent=<X>` subagent with the issue body as input
- On success: opens a PR linking to the issue, applies `forge:pr-open`, removes `forge:in-progress`
- On failure: applies `forge:blocked`, posts a comment with the failure reason, removes `forge:in-progress`

## Pre-conditions

The app's GitHub repo must have all `forge:*` labels created. Run `scripts/forge-init-labels.sh` once after creating the repo (already invoked by `integration-setup` if you ran the standard pipeline).

## Disabling auto-improvement

Set `watcher.enabled: false` in `forge.config.json` to stop the watcher from picking up issues. Issue creation by other agents continues — the queue just doesn't get worked.
