import {ArrowLeft, Home, Sparkles} from "lucide-react";

import {toAppHref} from "@/lib/app-href";
import {AppLink} from "@/components/app-link";

export default function NotFound() {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.16),_transparent_36%),linear-gradient(180deg,var(--bg-primary),var(--bg-secondary))] px-6 py-16 text-[var(--text-primary)]">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(113,113,122,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(113,113,122,0.08)_1px,transparent_1px)] bg-[size:72px_72px] opacity-40" />
      <div className="absolute left-1/2 top-12 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-[rgba(34,197,94,0.12)] blur-3xl" />

      <section className="w-full max-w-2xl rounded-3xl border border-[var(--card-border)] bg-[color-mix(in_srgb,var(--card-bg)_94%,transparent)] p-8 shadow-[var(--shadow-lg)] backdrop-blur-xl sm:p-10">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--accent)_35%,var(--card-border))] bg-[rgba(34,197,94,0.08)] px-4 py-2 text-sm font-semibold text-[var(--accent)]">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Page not found
        </div>

        <div className="space-y-5">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-[var(--text-tertiary)]">404</p>
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
            The page you are looking for does not exist.
          </h1>
          <p className="max-w-xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
            The address may be mistyped, the page may have moved, or the link you followed is no longer valid.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <AppLink
            href={toAppHref("/")}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(34,197,94,0.28)] transition-transform hover:translate-y-[-1px] hover:bg-[var(--accent-hover)]"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Go home
          </AppLink>
          <AppLink
            href={toAppHref("/dashboard")}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--card-border)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Open dashboard
          </AppLink>
        </div>
      </section>
    </main>
  );
}