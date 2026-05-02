---
name: accessibility-check
description: Run axe-core via Playwright on every key screen and report WCAG 2.1 AA violations. Used by the tester and as a standalone audit.
allowed-tools: Read, Write, Edit, Bash
---

# Accessibility Check

Audit the running app for WCAG 2.1 AA violations using axe-core.

## Process

1. **Ensure** `@axe-core/playwright` is installed (`npm i -D @axe-core/playwright`).
2. **Determine target URL.** Default: `http://localhost:3000` (start dev server if not running).
3. **Determine routes to test.** Read `APP_SPEC.md`'s Key Screens. Map to routes.
4. **Run an audit script.** If `playwright/a11y.spec.ts` doesn't exist, write one:

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = [/* derived from APP_SPEC.md */];

for (const route of ROUTES) {
  test(`a11y: ${route}`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const serious = results.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? ''));
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
}
```

5. **Run** `npx playwright test playwright/a11y.spec.ts`.

## Output

```markdown
# Accessibility Audit

## Per-screen
- /              — ✅ 0 serious/critical
- /dashboard     — ❌ 2 serious (color-contrast on .btn-primary, missing label on #search)
- /settings      — ✅ 0 serious/critical

## Top violations
1. **color-contrast** (serious) on `.btn-primary` at /dashboard — fg #FFF on bg #C5E0FF = 1.8:1 (need ≥ 4.5:1)
2. ...
```

## Rules

- **Block on serious + critical.** Moderate and minor are reported but don't fail the check.
- **Don't auto-fix.** Report only — the coder/polish agent fixes.
- **Cite the WCAG criterion** for each violation.
