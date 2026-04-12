import Link from "next/link";
import {
  BarChart3,
  Brain,
  Building2,
  Factory,
  Hospital,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { MarketingFooter } from "@/components/site/MarketingFooter";
import { MarketingNav } from "@/components/site/MarketingNav";

const capabilities = [
  {
    title: "Multi-source inference",
    description:
      "Skills inferred from GitHub, Teams, Jira, and reviews — not only self-reported lists — so profiles reflect how people actually work.",
    icon: Brain,
  },
  {
    title: "AI-powered testing",
    description:
      "IRT-style adaptive assessments that aim to measure precisely in many fewer questions than traditional tests.",
    icon: Zap,
  },
  {
    title: "Living skill profiles",
    description:
      "Scores can decay as evidence ages — designed to stay current instead of freezing the day someone filled a survey.",
    icon: TrendingUp,
  },
  {
    title: "Universal coverage",
    description:
      "Engineers, nurses, officers, and frontline workers — one model with sector-aware fields and consent.",
    icon: Users,
  },
  {
    title: "Compliance tracking",
    description:
      "Certification expiry signals and mandatory-training patterns — surfaced for HR before auditors ask.",
    icon: ShieldCheck,
  },
  {
    title: "Strategic reports",
    description:
      "Org and department views, heatmaps, and gap prioritization so L&D and leadership see the same truth.",
    icon: BarChart3,
  },
];

const steps = [
  {
    step: "01",
    title: "Connect your systems",
    body: "HRIS, Teams, GitHub, and HR data — with clear consent and least-privilege access patterns.",
  },
  {
    step: "02",
    title: "AI builds skill profiles",
    body: "Continuous inference from real work signals, normalized to ESCO-backed skills where applicable.",
  },
  {
    step: "03",
    title: "See gaps. Take action.",
    body: "Prioritized gaps with evidence, assessments when needed, and exportable views for stakeholders.",
  },
];

const sectors = [
  { name: "Corporate / IT", detail: "Engineering, product, GRC, and hybrid teams.", icon: Building2 },
  { name: "Government", detail: "Cadres, postings, and compliance-heavy workflows.", icon: ShieldCheck },
  { name: "Hospital", detail: "Clinical and support roles with registration-aware fields.", icon: Hospital },
  { name: "Manufacturing", detail: "Plants, shifts, safety, and technical depth at scale.", icon: Factory },
  { name: "Retail", detail: "Stores, CX, and high-churn frontline populations.", icon: Store },
];

const stats = [
  { label: "Skills tracked (demo scale)", value: "13,890+" },
  { label: "Sectors in product vision", value: "5" },
  { label: "Surveys required", value: "0" },
  { label: "Questions per adaptive run (target)", value: "≤ 20" },
];

const testimonials = [
  {
    quote: "We finally stopped arguing about who is “senior enough” for critical programs — the evidence is on the table.",
    role: "CHRO, multi-sector services group",
  },
  {
    quote: "Certification expiry used to live in spreadsheets. Now HR gets a single queue before incidents hit operations.",
    role: "Head of L&D, industrial company",
  },
  {
    quote: "Government reporting is painful enough; having one skill vocabulary across departments is a relief.",
    role: "Director IT, public sector program",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-tw-bg">
      <MarketingNav />

      <main>
        <section className="relative overflow-hidden bg-hero-mesh dark:bg-hero-mesh-dark">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-300/50 to-transparent dark:via-tw-border" />
          <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-20 lg:pt-24">
            <div className="mx-auto max-w-3xl text-center">
              <p className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-800 shadow-sm backdrop-blur dark:border-tw-border dark:bg-tw-card dark:text-tw-text">
                <Sparkles className="h-3.5 w-3.5 text-accent-500 dark:text-tw-blue" aria-hidden />
                AI-powered skill intelligence
              </p>
              <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight text-slate-900 dark:text-tw-text sm:text-5xl lg:text-6xl">
                See every skill.
                <span className="block bg-gradient-to-r from-brand-600 to-accent-600 bg-clip-text text-transparent dark:from-tw-blue dark:to-cyan-400">
                  Close every gap.
                </span>
              </h1>
              <p className="mt-6 text-balance text-lg leading-relaxed text-slate-600 dark:text-tw-muted sm:text-xl">
                Talent Map is built to continuously detect skill gaps across your workforce — from engineers to government
                officers to nurses — with evidence-backed profiles instead of one-off surveys.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                <Link
                  href="/onboarding"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 sm:w-auto dark:bg-tw-blue dark:shadow-none dark:hover:bg-tw-blue-hover"
                >
                  Start free — no credit card
                </Link>
                <Link
                  href="/#how-it-works"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white/80 px-6 py-3.5 text-base font-semibold text-slate-800 shadow-sm backdrop-blur transition hover:border-brand-200 hover:text-brand-800 sm:w-auto dark:border-tw-border dark:bg-tw-card dark:text-tw-text dark:hover:border-tw-blue dark:hover:text-tw-blue"
                >
                  See how it works
                </Link>
              </div>
              <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-500 dark:text-tw-muted">
                <span className="inline-flex items-center gap-2">
                  <Users className="h-4 w-4 text-brand-500 dark:text-tw-blue" aria-hidden />
                  Multi-tenant, RBAC-ready
                </span>
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-accent-600 dark:text-tw-blue" aria-hidden />
                  Consent-first integrations
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-100 bg-white py-10 dark:border-tw-border dark:bg-tw-bg">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-6">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-bold text-brand-700 dark:text-tw-blue">{s.value}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-tw-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="sectors" className="border-y border-slate-100 bg-slate-50/80 py-14 dark:border-tw-border dark:bg-tw-dim">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-tw-text sm:text-3xl">Built for every sector</h2>
              <p className="mt-3 text-slate-600 dark:text-tw-muted">
                Same engine — different defaults, fields, and risk patterns so HR does not force-fit a generic IT tool.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {sectors.map((s) => (
                <div
                  key={s.name}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:shadow-md dark:border-tw-border dark:bg-tw-card dark:hover:border-tw-blue/50 dark:hover:shadow-none"
                >
                  <s.icon className="h-8 w-8 text-brand-600 dark:text-tw-blue" aria-hidden />
                  <p className="mt-3 font-semibold text-slate-900 dark:text-tw-text">{s.name}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-tw-muted">{s.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="capabilities" className="py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-tw-text sm:text-3xl">What Talent Map delivers</h2>
              <p className="mt-3 text-slate-600 dark:text-tw-muted">
                Evidence, measurement, and prioritization in one place — fewer spreadsheets, fewer debates, faster decisions.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {capabilities.map((c) => (
                <article
                  key={c.title}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-200 hover:shadow-glow dark:border-tw-border dark:bg-tw-card dark:hover:border-tw-blue/40 dark:hover:shadow-glow-dark"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 transition group-hover:bg-brand-600 group-hover:text-white group-hover:ring-brand-500 dark:bg-tw-raised dark:text-tw-blue dark:ring-tw-border group-hover:dark:bg-tw-blue group-hover:dark:text-white">
                    <c.icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-tw-text">{c.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-tw-muted">{c.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="border-t border-slate-100 bg-slate-50 py-16 dark:border-tw-border dark:bg-tw-dim sm:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-tw-text sm:text-3xl">How it works</h2>
              <p className="mt-3 text-slate-600 dark:text-tw-muted">Three moves from empty tenant to actionable gap intelligence.</p>
            </div>
            <ol className="mt-12 grid gap-6 lg:grid-cols-3">
              {steps.map((s) => (
                <li
                  key={s.step}
                  className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-tw-border dark:bg-tw-card"
                >
                  <span className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-tw-blue">{s.step}</span>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-tw-text">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-tw-muted">{s.body}</p>
                </li>
              ))}
            </ol>
            <div className="mt-12 flex justify-center">
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 dark:bg-tw-blue dark:hover:bg-tw-blue-hover"
              >
                Begin onboarding
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-center text-2xl font-bold text-slate-900 dark:text-tw-text sm:text-3xl">Why teams care now</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600 dark:text-tw-muted">
              Industry research consistently shows capability risk at the top of the C-suite agenda — Talent Map is built to
              operationalize that conversation with evidence.
            </p>
            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {testimonials.map((t, i) => (
                <blockquote
                  key={i}
                  className="rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-700 shadow-sm dark:border-tw-border dark:bg-tw-card dark:text-tw-muted"
                >
                  <p className="text-slate-900 dark:text-tw-text">&ldquo;{t.quote}&rdquo;</p>
                  <footer className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-tw-muted">{t.role}</footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="border-t border-slate-100 bg-slate-50 py-16 dark:border-tw-border dark:bg-tw-dim sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-tw-text sm:text-3xl">Simple, transparent pricing</h2>
              <p className="mt-3 text-slate-600 dark:text-tw-muted">Illustrative tiers for planning conversations — finalize with sales for your sector and scale.</p>
            </div>
            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {[
                { name: "Starter", price: "₹199", sub: "per employee / month", bullets: ["Core skill profiles", "Department views", "Email support"] },
                { name: "Professional", price: "₹399", sub: "per employee / month", bullets: ["Adaptive assessments", "Integrations bundle", "Priority support"], highlight: true },
                { name: "Enterprise", price: "Custom", sub: "volume & residency", bullets: ["SSO & SCIM", "Private connectivity", "Dedicated CSM"] },
              ].map((tier) => (
                <div
                  key={tier.name}
                  className={`rounded-2xl border bg-white p-6 shadow-sm dark:bg-tw-card ${
                    tier.highlight ? "border-brand-400 ring-2 ring-brand-200 dark:border-tw-blue dark:ring-tw-border" : "border-slate-200 dark:border-tw-border"
                  }`}
                >
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-tw-text">{tier.name}</h3>
                  <p className="mt-2 text-3xl font-bold text-brand-700 dark:text-tw-blue">
                    {tier.price}
                    {tier.price !== "Custom" && <span className="text-base font-normal text-slate-500 dark:text-tw-muted"> / emp / mo</span>}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-tw-muted">{tier.sub}</p>
                  <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-tw-muted">
                    {tier.bullets.map((b) => (
                      <li key={b}>• {b}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-xs text-slate-500 dark:text-tw-muted">
              Government and hospital programs often need bespoke residency and integration paths — we will quote separately.
            </p>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-accent-600 px-6 py-12 text-center text-white shadow-xl dark:border dark:border-tw-border dark:bg-tw-card dark:bg-none dark:from-tw-card dark:via-tw-card dark:to-tw-card dark:shadow-none sm:px-12 sm:py-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready to see your workforce clearly?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-indigo-100 dark:text-tw-muted sm:text-lg">
              Create your organization in minutes, finish HR onboarding, and invite employees — no credit card required for the guided MVP path.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/onboarding"
                className="inline-flex w-full items-center justify-center rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-slate-50 sm:w-auto dark:bg-tw-blue dark:text-white dark:hover:bg-tw-blue-hover"
              >
                Get started free
              </Link>
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center rounded-xl border border-white/30 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto dark:border-tw-border dark:text-tw-text dark:hover:bg-tw-raised"
              >
                I already have access
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
