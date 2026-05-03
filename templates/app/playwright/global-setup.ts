/**
 * Creates a Clerk test user once per test run, signs in, and persists the
 * session so individual specs reuse it via `storageState`.
 *
 * Provides env vars for tests to reference:
 *   CLERK_TEST_USER_EMAIL, CLERK_TEST_USER_PASSWORD
 *
 * Skipped when Clerk envs are not present (smoke-only mode).
 */
import { chromium, type FullConfig } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const STORAGE_PATH = path.resolve('playwright/.auth/storage-state.json');
const TEST_USER_EMAIL =
  process.env.CLERK_TEST_USER_EMAIL ?? `forge-test-${Date.now()}@example.com`;
const TEST_USER_PASSWORD =
  process.env.CLERK_TEST_USER_PASSWORD ?? `Forge!${Math.random().toString(36).slice(2, 10)}A1`;

async function createClerkUser(): Promise<{ userId: string } | null> {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) return null;
  const res = await fetch('https://api.clerk.com/v1/users', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email_address: [TEST_USER_EMAIL],
      password: TEST_USER_PASSWORD,
      skip_password_checks: true,
    }),
  });
  if (!res.ok) {
    if (res.status === 422) return null;
    throw new Error(`Clerk createUser failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { id: string };
  return { userId: json.id };
}

async function signIn(baseURL: string): Promise<void> {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  try {
    await page.goto(`${baseURL.replace(/\/$/, '')}/sign-in`);
    await page.getByLabel(/email/i).fill(TEST_USER_EMAIL);
    await page.getByRole('button', { name: /continue|sign in/i }).first().click();
    await page.getByLabel(/password/i).fill(TEST_USER_PASSWORD);
    await page.getByRole('button', { name: /continue|sign in/i }).first().click();
    await page.waitForURL((url) => !/\/sign-in/.test(url.pathname), { timeout: 30_000 });
    await mkdir(path.dirname(STORAGE_PATH), { recursive: true });
    await ctx.storageState({ path: STORAGE_PATH });
  } finally {
    await ctx.close();
    await browser.close();
  }
}

async function persistMeta(userId: string | null): Promise<void> {
  const meta = { email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD, userId };
  await writeFile(path.resolve('playwright/.auth/test-user.json'), JSON.stringify(meta, null, 2));
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  if (!process.env.CLERK_SECRET_KEY) {
    console.warn('[global-setup] CLERK_SECRET_KEY not set — skipping authed-user setup');
    return;
  }
  const baseURL = config.projects[0]?.use?.baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
  await mkdir(path.dirname(STORAGE_PATH), { recursive: true });
  const created = await createClerkUser();
  await persistMeta(created?.userId ?? null);
  await signIn(baseURL);
  process.env.CLERK_TEST_USER_EMAIL = TEST_USER_EMAIL;
  process.env.CLERK_TEST_USER_PASSWORD = TEST_USER_PASSWORD;
}
