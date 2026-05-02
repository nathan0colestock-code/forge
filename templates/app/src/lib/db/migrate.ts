import 'dotenv/config';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { db, sqlite } from './client';

async function main() {
  console.warn('[migrate] running migrations…');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.warn('[migrate] done');
  sqlite.close();
}

main().catch((err) => {
  console.error('[migrate] failed', err);
  process.exit(1);
});
