import { test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const ROUTES: string[] = ['/', '/sign-in', '/sign-up'];

const ITERATION = process.env.FORGE_ITERATION ?? 'manual';
const OUT_DIR = path.resolve('.forge/state/screenshots', String(ITERATION));

test.describe.configure({ mode: 'parallel' });

for (const route of ROUTES) {
  test(`screenshot: ${route}`, async ({ page }, testInfo) => {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    const viewport = testInfo.project.name;
    const slug = route === '/' ? 'home' : route.replace(/^\//, '').replace(/\W+/g, '-');
    const dir = path.join(OUT_DIR, viewport);
    await mkdir(dir, { recursive: true });
    await page.screenshot({ path: path.join(dir, `${slug}.png`), fullPage: true });
  });
}
