import { Resend } from 'resend';
import { log } from '@/lib/logger';

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

let _resend: Resend | null = null;
function client(): Resend {
  if (_resend) return _resend;
  if (!apiKey) throw new Error('RESEND_API_KEY is not set');
  _resend = new Resend(apiKey);
  return _resend;
}

export async function sendEmail(args: { to: string | string[]; subject: string; html?: string; text?: string }) {
  const res = await client().emails.send({ from, ...args });
  if (res.error) {
    await log('error', 'email.failed', { to: args.to, subject: args.subject, error: res.error });
    throw new Error(`Resend send failed: ${res.error.message}`);
  }
  await log('info', 'email.sent', { to: args.to, subject: args.subject, id: res.data?.id });
  return res.data;
}
