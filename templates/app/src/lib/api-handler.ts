import { auth } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest } from 'next/server';
import { log } from './logger';

type Handler<TBody = unknown> = (ctx: {
  req: NextRequest;
  userId: string | null;
  requestId: string;
  body: TBody;
}) => Promise<Response | NextResponse>;

interface Options { requireAuth?: boolean; parseBody?: boolean }

/**
 * Wrap a route handler with structured logging, request IDs, optional auth,
 * and consistent error responses. log() is non-blocking — request returns
 * before logs ship.
 */
export function handler<TBody = unknown>(fn: Handler<TBody>, opts: Options = {}) {
  return async (req: NextRequest): Promise<Response> => {
    const requestId = crypto.randomUUID();
    const start = performance.now();
    let userId: string | null = null;
    let status = 200;
    const path = new URL(req.url).pathname;

    try {
      if (opts.requireAuth) {
        const a = await auth();
        userId = a.userId;
        if (!userId) {
          status = 401;
          return NextResponse.json({ error: 'unauthorized' }, { status });
        }
      } else {
        const a = await auth();
        userId = a.userId ?? null;
      }

      let body: TBody = undefined as TBody;
      if (opts.parseBody) {
        try {
          body = (await req.json()) as TBody;
        } catch {
          status = 400;
          return NextResponse.json({ error: 'invalid_json' }, { status });
        }
      }

      const res = await fn({ req, userId, requestId, body });
      status = res.status;
      res.headers.set('x-request-id', requestId);
      return res;
    } catch (err) {
      status = 500;
      const error = err instanceof Error ? { message: err.message, stack: err.stack } : { message: String(err) };
      log('error', 'api.unhandled', { requestId, method: req.method, path, userId, error });
      return NextResponse.json({ error: 'internal' }, { status, headers: { 'x-request-id': requestId } });
    } finally {
      const durationMs = Math.round(performance.now() - start);
      const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
      log(level, 'api.request', { requestId, method: req.method, path, userId, durationMs, status });
    }
  };
}
