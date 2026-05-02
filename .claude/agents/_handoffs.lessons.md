# Handoff Lessons

Cross-agent lessons about how Forge subagents work *together*. Each entry is appended by the `retro` agent after observing a handoff weakness across one or more builds.

Subagents read this file on entry, alongside their own `<name>.lessons.md`. Lessons here are about handoffs you give and receive — what the agent before you typically misses, what the agent after you typically needs.

**Format:**

```markdown
## Lesson — <ISO date> — <upstream> → <downstream>: <title>

**Scope:** app-specific | framework-wide
**Trigger:** <what happened across builds that prompted this lesson>
**What to do differently:**
- Upstream (<upstream>): <concrete change>
- Downstream (<downstream>): <concrete change, if any>

**Evidence:** <build IDs, scorecard rows, conflict log entries>
```

---

(no lessons yet)
