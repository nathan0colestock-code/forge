/* tsx scripts/screenshot.ts <iteration> [base-url]
 * Standalone helper used by the visual-score skill outside of test runs.
 * Re-uses the Playwright config's projects (desktop / mobile / tablet).
 */
import { chromium, devices } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const ITERATION = process.argv[2] ?? new Date().toISOString().replace(/[:.]/g, '-');
const BASE_URL = process.argv[3] ?? process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

const ROUTES = (process.env.FORGE_SCREENSHOT_ROUTES ?? '/,/sign-in,/sign-up').split(',').map((r) => r.trim());

const VIEWPORTS = [
  { name: 'desktop', viewport: { width: 1280, height: 800 }, ua: undefined },
  { name: 'mobile',  ...devices['iPhone 14'] },
  { name: 'tablet',  ...devices['iPad (gen 7)'] },
] as const;

async function main() {
  const browser = await chromium.launch();
  for (const v of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: v.viewport,
      userAgent: 'userAgent' in v ? v.userAgent : undefined,
      deviceScaleFactor: 'deviceScaleFactor' in v ? v.deviceScaleFactor : 1,
      isMobile: 'isMobile' in v ? v.isMobile : false,
      hasTouch: 'hasTouch' in v ? v.hasTouch : false,
    });
    const page = await ctx.newPage();
    for (const route of ROUTES) {
      await page.goto(BASE_URL + route);
      await page.waitForLoadState('networkidle').catch(() => {});
      const slug = route === '/' ? 'home' : route.replace(/^\//, '').replace(/\W+/g, '-');
      const dir = path.resolve('.forge/state/screenshots', ITERATION, v.name);
      await mkdir(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, `${slug}.png`), fullPage: true });
      console.warn(`✓ ${v.name} ${route}`);
    }
    await ctx.close();
  }
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
