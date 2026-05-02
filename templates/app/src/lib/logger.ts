/**
 * Forge structured logger.
 * Writes JSON events to Better Stack via HTTP source ingest.
 * In dev, also mirrors to console for visibility.
 */

type Level = 'info' | 'warn' | 'error';

const INGEST_URL = process.env.BETTERSTACK_INGEST_URL ?? 'https://in.logs.betterstack.com';
const SOURCE_TOKEN = process.env.BETTERSTACK_SOURCE_TOKEN;
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'forge-app';
const ENV = process.env.NODE_ENV ?? 'development';

const SECRET_KEYS = /^(authorization|cookie|.*_token|.*_secret|password)$/i;

function redact(input: unknown): unknown {
  if (input == null) return input;
  if (Array.isArray(input)) return input.map(redact);
  if (typeof input !== 'object') return input;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    out[k] = SECRET_KEYS.test(k) ? '[REDACTED]' : redact(v);
  }
  return out;
}

export async function log(level: Level, event: string, fields: Record<string, unknown> = {}): Promise<void> {
  const payload = {
    dt: new Date().toISOString(),
    level,
    event,
    app: APP_NAME,
    env: ENV,
    ...(redact(fields) as Record<string, unknown>),
  };

  if (ENV !== 'production') {
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.warn;
    fn(`[${level}] ${event}`, payload);
  }

  if (!SOURCE_TOKEN) return;

  try {
    await fetch(INGEST_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SOURCE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch (err) {
    console.error('[logger] failed to ship log', err);
  }
}
