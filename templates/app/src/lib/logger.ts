/**
 * Forge structured logger.
 *
 * Design goals:
 * - Never block a request. log() returns synchronously after enqueueing.
 * - Survive Better Stack outages. Failed batches retry (3x, exp backoff).
 * - Stay under free-tier limits. Sample successful info logs in prod.
 *
 * Emits one JSON line per event to Better Stack via batched HTTP ingest.
 * In dev, mirrors to console.
 */

type Level = 'info' | 'warn' | 'error';

const INGEST_URL = process.env.BETTERSTACK_INGEST_URL ?? 'https://in.logs.betterstack.com';
const SOURCE_TOKEN = process.env.BETTERSTACK_SOURCE_TOKEN;
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'forge-app';
const ENV = process.env.NODE_ENV ?? 'development';
const CONFIGURED_LEVEL = (process.env.LOG_LEVEL ?? (ENV === 'production' ? 'warn' : 'info')) as Level;
const INFO_SAMPLE_RATE = Number(process.env.LOG_INFO_SAMPLE_RATE ?? (ENV === 'production' ? 0.1 : 1));

const LEVEL_RANK: Record<Level, number> = { info: 0, warn: 1, error: 2 };
const SECRET_KEYS = /^(authorization|cookie|.*_token|.*_secret|password)$/i;

const BATCH_SIZE = 20;
const BATCH_INTERVAL_MS = 1000;
const MAX_QUEUE = 500;
const RETRY_DELAYS_MS = [100, 300, 900];

interface LogEvent {
  dt: string;
  level: Level;
  event: string;
  app: string;
  env: string;
  [k: string]: unknown;
}

let queue: LogEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let dropped = 0;

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

function shouldEmit(level: Level): boolean {
  if (LEVEL_RANK[level] < LEVEL_RANK[CONFIGURED_LEVEL]) return false;
  if (level === 'info' && INFO_SAMPLE_RATE < 1 && Math.random() > INFO_SAMPLE_RATE) return false;
  return true;
}

async function shipBatch(events: LogEvent[]): Promise<void> {
  if (!SOURCE_TOKEN || events.length === 0) return;
  const body = events.length === 1 ? JSON.stringify(events[0]) : JSON.stringify(events);
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetch(INGEST_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SOURCE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body,
        keepalive: true,
      });
      if (res.ok) return;
      if (res.status >= 400 && res.status < 500) return;
    } catch {
      // network error — fall through to retry
    }
    if (attempt < RETRY_DELAYS_MS.length) {
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    }
  }
  console.error(`[logger] failed to ship ${events.length} events after retries`);
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, BATCH_INTERVAL_MS);
}

export async function flush(): Promise<void> {
  if (queue.length === 0) return;
  const batch = queue;
  queue = [];
  await shipBatch(batch);
}

export function log(level: Level, event: string, fields: Record<string, unknown> = {}): void {
  if (!shouldEmit(level)) return;

  const payload: LogEvent = {
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

  if (queue.length >= MAX_QUEUE) {
    dropped++;
    return;
  }
  queue.push(payload);

  if (queue.length >= BATCH_SIZE) {
    void flush();
  } else {
    scheduleFlush();
  }
}

export function loggerStats(): { queued: number; dropped: number } {
  return { queued: queue.length, dropped };
}

if (typeof process !== 'undefined' && typeof process.on === 'function') {
  const finalFlush = () => {
    void flush();
  };
  process.on('beforeExit', finalFlush);
  process.on('SIGTERM', finalFlush);
  process.on('SIGINT', finalFlush);
}
