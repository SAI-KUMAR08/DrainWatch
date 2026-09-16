'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { setAuthTokenGetter } from '@workspace/api-client-react';

if (typeof window !== 'undefined') {
  setAuthTokenGetter(() => {
    try {
      const session = JSON.parse(localStorage.getItem('drainwatch-session') || '{}') as {
        token?: string;
      };
      return session.token ?? null;
    } catch {
      return null;
    }
  });
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {children}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
