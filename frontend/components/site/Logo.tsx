import Link from "next/link";
import { Radar } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = { className?: string; withWordmark?: boolean };

export function Logo({ className, withWordmark = true }: Props) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-lg shadow-brand-500/25 ring-1 ring-white/10 transition group-hover:shadow-brand-500/40 dark:from-tw-blue dark:to-cyan-500 dark:shadow-tw-blue/20">
        <Radar className="h-5 w-5" aria-hidden />
      </span>
      {withWordmark && (
        <span className="font-semibold tracking-tight text-slate-900 dark:text-tw-text">
          Talent{" "}
          <span className="text-brand-600 dark:text-tw-blue">Map</span>
        </span>
      )}
    </Link>
  );
}
