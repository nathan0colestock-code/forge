'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    void fetch('/api/log/client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: 'error',
        source: 'client',
        route: typeof window !== 'undefined' ? window.location.pathname : '/',
        error: { message: error.message, stack: error.stack },
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <html>
      <body className="flex min-h-screen items-center justify-center bg-bg p-6 text-fg">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-fg-muted">We've logged the error. Please try again.</p>
          <button onClick={reset} className="mt-6 rounded-md bg-accent px-4 py-2 text-accent-fg">
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
