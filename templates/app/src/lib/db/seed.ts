import 'dotenv/config';
import { db, sqlite } from './client';
import { users } from './schema';

async function main() {
  console.warn('[seed] inserting baseline users…');
  await db.insert(users).values([
    { id: 'user_seed_alex',   email: 'alex@example.com' },
    { id: 'user_seed_jordan', email: 'jordan@example.com' },
  ]).onConflictDoNothing();
  console.warn('[seed] done');
  sqlite.close();
}

main().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});
