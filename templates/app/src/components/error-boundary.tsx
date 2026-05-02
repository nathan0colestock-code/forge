'use client';

import { Component, type ReactNode } from 'react';

interface State { error: Error | null }

/** Client-side error boundary. Logs to /api/log/client and shows a fallback. */
export class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State { return { error }; }

  componentDidCatch(error: Error) {
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
  }

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="mt-2 text-fg-muted">The error has been reported.</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-4 rounded-md bg-accent px-4 py-2 text-sm text-accent-fg"
          >
            Reset
          </button>
        </div>
      </div>
    );
  }
}
