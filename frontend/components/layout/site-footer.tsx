"use client";

import {useTranslations} from "next-intl";

export function SiteFooter() {
  const t = useTranslations("landing");
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 px-4 pb-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-6 shadow-[var(--shadow-sm)]">
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-[var(--text-tertiary)]">
              {t("copyright").replace("2025", String(year))}
          </p>

          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
              {t("tagline")}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
