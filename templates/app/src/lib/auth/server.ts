import { auth, currentUser } from '@clerk/nextjs/server';

/** Throws 'unauthorized' if no user. Use in server actions and server components. */
export async function requireUser(): Promise<{ userId: string }> {
  const { userId } = await auth();
  if (!userId) throw new Error('unauthorized');
  return { userId };
}

export { auth, currentUser };
