"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Scoped to /hr and /employee only so public routes (/, /onboarding, /login) do not load
 * @tanstack/react-query in the root RSC bundle — avoids Windows dev chunk issues
 * (e.g. missing ./vendor-chunks/@tanstack.js).
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, retry: 1 },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
