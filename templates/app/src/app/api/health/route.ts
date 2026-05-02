import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    version: process.env.GIT_SHA ?? 'dev',
    timestamp: new Date().toISOString(),
  });
}
