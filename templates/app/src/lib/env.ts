/**
 * Runtime + build-time env validation.
 * Imported from next.config.ts so missing/malformed envs fail the build,
 * not the first request.
 */
import { z } from 'zod';

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  TURSO_DATABASE_URL: z.string().url(),
  TURSO_AUTH_TOKEN: z.string().min(1).optional(),
  CLERK_SECRET_KEY: z.string().startsWith('sk_'),
  CLOUDFLARE_ACCOUNT_ID: z.string().min(1).optional(),
  CLOUDFLARE_R2_BUCKET_NAME: z.string().min(1).optional(),
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  CLOUDFLARE_R2_ENDPOINT: z.string().url().optional(),
  RESEND_API_KEY: z.string().startsWith('re_').optional(),
  RESEND_FROM_EMAIL: z.string().email().default('onboarding@resend.dev'),
  BETTERSTACK_INGEST_URL: z.string().url().default('https://in.logs.betterstack.com'),
  BETTERSTACK_SOURCE_TOKEN: z.string().min(1).optional(),
  BETTERSTACK_SOURCE_ID: z.string().min(1).optional(),
  BETTERSTACK_API_TOKEN: z.string().min(1).optional(),
  LOG_LEVEL: z.enum(['info', 'warn', 'error']).optional(),
  LOG_INFO_SAMPLE_RATE: z.coerce.number().min(0).max(1).optional(),
  GIT_SHA: z.string().optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default('/sign-in'),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default('/sign-up'),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default('/'),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default('/'),
  NEXT_PUBLIC_APP_NAME: z.string().default('Forge App'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

const isServer = typeof window === 'undefined';
const skipValidation = !!process.env.SKIP_ENV_VALIDATION;

function parse<T extends z.ZodTypeAny>(schema: T, source: Record<string, string | undefined>): z.infer<T> {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}

const merged = skipValidation
  ? ({ ...process.env } as unknown as z.infer<typeof serverSchema> & z.infer<typeof clientSchema>)
  : isServer
  ? { ...parse(serverSchema, process.env), ...parse(clientSchema, process.env) }
  : (parse(clientSchema, process.env) as z.infer<typeof serverSchema> & z.infer<typeof clientSchema>);

export const env = merged;
