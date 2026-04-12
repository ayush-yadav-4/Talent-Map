import Link from "next/link";
import { Logo } from "@/components/site/Logo";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 dark:border-tw-border dark:bg-tw-dim">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm space-y-3">
            <Logo />
            <p className="text-sm leading-relaxed text-slate-600 dark:text-tw-muted">
              Talent Map helps HR and L&D teams run on evidence — living profiles, adaptive assessments where needed, and
              prioritized gaps across every workforce type.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-tw-muted">Product</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-tw-muted">
                <li>
                  <Link href="/onboarding" className="hover:text-brand-700 dark:hover:text-tw-blue">
                    Get started
                  </Link>
                </li>
                <li>
                  <a href={`${apiUrl}/docs`} className="hover:text-brand-700 dark:hover:text-tw-blue" target="_blank" rel="noreferrer">
                    API docs
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-tw-muted">Trust</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-tw-muted">
                <li>
                  <span className="cursor-not-allowed opacity-70">Privacy (soon)</span>
                </li>
                <li>
                  <span className="cursor-not-allowed opacity-70">Security (soon)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <p className="mt-10 border-t border-slate-200 pt-8 text-center text-xs text-slate-500 dark:border-tw-border dark:text-tw-muted">
          © {new Date().getFullYear()} Talent Map. Skill intelligence for modern organizations.
        </p>
      </div>
    </footer>
  );
}
