import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PUBLIC_ROUTES: string[] = ['/', '/sign-in', '/sign-up'];

for (const route of PUBLIC_ROUTES) {
  test(`a11y: ${route}`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
    expect.soft(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });
}
