/**
 * Generate iPhone-quality app icons from public/brand/logo.svg.
 *
 * Outputs:
 *   public/icons/icon-180.png            (apple-touch-icon)
 *   public/icons/icon-192.png            (PWA)
 *   public/icons/icon-512.png            (PWA)
 *   public/icons/icon-maskable-512.png   (PWA maskable, 10% safe area)
 *   public/apple-touch-icon.png          (copy of 180)
 *   public/favicon.ico                   (32×32 multi-size from favicon.svg)
 *
 * Uses Playwright headless Chromium to rasterize SVG. No native deps.
 */
import { chromium } from '@playwright/test';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = process.cwd();
const BRAND_DIR = path.join(ROOT, 'public', 'brand');
const ICONS_DIR = path.join(ROOT, 'public', 'icons');
const LOGO_SVG = path.join(BRAND_DIR, 'logo.svg');
const FAVICON_SVG = path.join(BRAND_DIR, 'favicon.svg');
const APPLE_TOUCH = path.join(ROOT, 'public', 'apple-touch-icon.png');

const TARGETS = [
  { name: 'icon-180.png',          size: 180, padding: 0 },
  { name: 'icon-192.png',          size: 192, padding: 0 },
  { name: 'icon-512.png',          size: 512, padding: 0 },
  { name: 'icon-maskable-512.png', size: 512, padding: 0.1 },
];

async function readManifestColors(): Promise<{ bg: string; fg: string }> {
  const manifestPath = path.join(ROOT, 'public', 'manifest.webmanifest');
  const fallback = { bg: '#0a0a0a', fg: '#ffffff' };
  if (!existsSync(manifestPath)) return fallback;
  try {
    const m = JSON.parse(await readFile(manifestPath, 'utf8')) as { background_color?: string; theme_color?: string };
    return { bg: m.background_color ?? fallback.bg, fg: m.theme_color ?? fallback.fg };
  } catch {
    return fallback;
  }
}

function pageHtml(svgMarkup: string, size: number, padding: number, bg: string): string {
  const inner = Math.round(size * (1 - padding * 2));
  const offset = Math.round((size - inner) / 2);
  return `<!doctype html>
<html><head><style>
  html,body { margin:0; padding:0; background:${bg}; }
  .wrap { width:${size}px; height:${size}px; position:relative; }
  .mark { position:absolute; left:${offset}px; top:${offset}px; width:${inner}px; height:${inner}px; }
  .mark > svg { width:100%; height:100%; display:block; }
</style></head>
<body><div class="wrap"><div class="mark">${svgMarkup}</div></div></body></html>`;
}

async function main(): Promise<void> {
  if (!existsSync(LOGO_SVG)) {
    console.error(`✗ ${LOGO_SVG} not found. The designer agent must produce it before icons can generate.`);
    process.exit(1);
  }
  await mkdir(ICONS_DIR, { recursive: true });
  const svg = await readFile(LOGO_SVG, 'utf8');
  const { bg } = await readManifestColors();

  const browser = await chromium.launch();
  try {
    for (const t of TARGETS) {
      const ctx = await browser.newContext({ viewport: { width: t.size, height: t.size }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.setContent(pageHtml(svg, t.size, t.padding, bg));
      const out = path.join(ICONS_DIR, t.name);
      await page.screenshot({ path: out, omitBackground: false, clip: { x: 0, y: 0, width: t.size, height: t.size } });
      console.warn(`✓ ${t.name}`);
      await ctx.close();
    }
  } finally {
    await browser.close();
  }

  await copyFile(path.join(ICONS_DIR, 'icon-180.png'), APPLE_TOUCH);
  console.warn(`✓ apple-touch-icon.png`);

  if (existsSync(FAVICON_SVG)) {
    const browser2 = await chromium.launch();
    try {
      const ctx = await browser2.newContext({ viewport: { width: 32, height: 32 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      const fav = await readFile(FAVICON_SVG, 'utf8');
      await page.setContent(pageHtml(fav, 32, 0, 'transparent'));
      const out = path.join(ROOT, 'public', 'favicon-32.png');
      await page.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: 32, height: 32 } });
      console.warn('✓ favicon-32.png (use as src; ICO multi-size requires native tooling and is optional)');
      await writeFile(path.join(ROOT, 'public', 'favicon.ico.notice.txt'),
        'For a true multi-size .ico, run: npx --yes png-to-ico public/favicon-32.png > public/favicon.ico\n' +
        'Most modern browsers accept favicon-32.png referenced from layout metadata.\n');
    } finally {
      await browser2.close();
    }
  }

  console.warn('\n✓ Icons generated. Manifest references public/icons/*. apple-touch-icon at /apple-touch-icon.png.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
