"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";

/** Root UI only — React Query lives in `QueryProvider` under /hr and /employee layouts. */
export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const suppressMetaMaskMissingExtensionError = (event: PromiseRejectionEvent) => {
      const errorReason =
        typeof event.reason === "string"
          ? event.reason
          : event.reason instanceof Error
            ? event.reason.message
            : "";

      if (errorReason.includes("Failed to connect to MetaMask") || errorReason.includes("MetaMask extension not found")) {
        event.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", suppressMetaMaskMissingExtensionError);

    return () => {
      window.removeEventListener("unhandledrejection", suppressMetaMaskMissingExtensionError);
    };
  }, []);

  return (
    <>
      {children}
      <Toaster position="top-right" richColors />
    </>
  );
}
