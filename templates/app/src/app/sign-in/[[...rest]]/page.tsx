import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-subtle p-6">
      <SignIn appearance={{ elements: { card: 'shadow-lg rounded-lg border border-border' } }} />
    </main>
  );
}
