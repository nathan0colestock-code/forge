/**
 * Deletes the test user created by global-setup.ts.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const META_PATH = path.resolve('playwright/.auth/test-user.json');

export default async function globalTeardown(): Promise<void> {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) return;
  let meta: { userId: string | null } | null = null;
  try {
    meta = JSON.parse(await readFile(META_PATH, 'utf8'));
  } catch {
    return;
  }
  if (!meta?.userId) return;
  await fetch(`https://api.clerk.com/v1/users/${meta.userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${secret}` },
  }).catch(() => {});
}
