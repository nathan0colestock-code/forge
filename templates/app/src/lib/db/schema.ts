import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * Default schema. The data-model agent replaces this per-app from APP_SPEC.md.
 * The `users` table mirrors Clerk user IDs so app-owned data can foreign-key to it.
 */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
