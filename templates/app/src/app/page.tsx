import Link from 'next/link';

/** Public landing page. Replaced by the designer agent's output. */
export default function HomePage() {
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-8 py-24 text-center">
      <span className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-wider text-fg-muted">
        Forge scaffold
      </span>
      <h1 className="font-display text-5xl font-semibold leading-tight md:text-7xl">
        Your app starts here.
      </h1>
      <p className="max-w-xl text-balance text-lg text-fg-muted">
        This is the placeholder landing page. The Forge designer agent replaces it during the build.
      </p>
      <div className="flex gap-3">
        <Link
          href="/sign-up"
          className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg shadow-sm transition hover:opacity-90"
        >
          Get started
        </Link>
        <Link
          href="/sign-in"
          className="rounded-md border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-bg-subtle"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
