'use client';

import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';

interface ProvidersProps {
  children: React.ReactNode;
  session?: Session | null | undefined;
}

export function Providers({ children, session = null }: ProvidersProps) {
  return (
    <SessionProvider session={session}>
      {children}
    </SessionProvider>
  );
}
