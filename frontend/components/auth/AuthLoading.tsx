import { Loader2 } from "lucide-react";

export function AuthLoading({ label = "Checking your session…" }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-tw-bg">
      <Loader2 className="h-8 w-8 animate-spin text-brand-600 dark:text-tw-blue" aria-hidden />
      <p className="text-sm text-slate-600 dark:text-tw-muted">{label}</p>
    </div>
  );
}
