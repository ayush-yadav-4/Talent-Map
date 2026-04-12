"use client";

import { Toaster } from "sonner";

/** Root UI only — React Query lives in `QueryProvider` under /hr and /employee layouts. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="top-right" richColors />
    </>
  );
}
