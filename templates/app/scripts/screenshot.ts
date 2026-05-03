/* tsx scripts/screenshot.ts <iteration> [base-url]
 * Standalone helper used by the visual-score skill outside of test runs.
 * Captures every route × every viewport in parallel.
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

const READY_SELECTORS = (process.env.FORGE_READY_SELECTOR ?? 'main,header,h1').split(',');

async function captureViewport(browser: Awaited<ReturnType<typeof chromium.launch>>, v: typeof VIEWPORTS[number]) {
  const ctx = await browser.newContext({
    viewport: v.viewport,
    userAgent: 'userAgent' in v ? v.userAgent : undefined,
    deviceScaleFactor: 'deviceScaleFactor' in v ? v.deviceScaleFactor : 1,
    isMobile: 'isMobile' in v ? v.isMobile : false,
    hasTouch: 'hasTouch' in v ? v.hasTouch : false,
  });
  try {
    await Promise.all(
      ROUTES.map(async (route) => {
        const page = await ctx.newPage();
        try {
          await page.goto(BASE_URL + route, { waitUntil: 'domcontentloaded' });
          for (const sel of READY_SELECTORS) {
            const found = await page.locator(sel).first().waitFor({ timeout: 3000 }).then(() => true).catch(() => false);
            if (found) break;
          }
          await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
          const slug = route === '/' ? 'home' : route.replace(/^\//, '').replace(/\W+/g, '-');
          const dir = path.resolve('.forge/state/screenshots', ITERATION, v.name);
          await mkdir(dir, { recursive: true });
          await page.screenshot({ path: path.join(dir, `${slug}.png`), fullPage: true });
          console.warn(`✓ ${v.name} ${route}`);
        } finally {
          await page.close();
        }
      }),
    );
  } finally {
    await ctx.close();
  }
}

async function main() {
  const browser = await chromium.launch();
  try {
    await Promise.all(VIEWPORTS.map((v) => captureViewport(browser, v)));
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
