import { NextResponse } from 'next/server';
import { z } from 'zod';
import { log } from '@/lib/logger';

const ClientLog = z.object({
  level: z.enum(['info', 'warn', 'error']),
  source: z.literal('client'),
  route: z.string(),
  userId: z.string().nullable().optional(),
  error: z.object({ message: z.string(), stack: z.string().optional() }).optional(),
  userAgent: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = ClientLog.parse(body);
    await log(parsed.level, 'client.event', parsed);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
  }
}
