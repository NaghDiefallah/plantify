"use client";

import {Languages, MoonStar, Settings2} from "lucide-react";
import {useMemo} from "react";

import {DashboardShell} from "@/components/dashboard/dashboard-shell";
import {type DashboardNavItem} from "@/components/dashboard/dashboard-sidebar";
import {LanguageModalButton} from "@/components/ui/language-modal";
import {ThemeToggle} from "@/components/ui/theme-toggle";

export default function SettingsPage() {
  const navItems = useMemo<DashboardNavItem[]>(() => {
    return [];
  }, []);

  return (
    <DashboardShell
      navItems={navItems}
      activeSection="settings"
      topBarLead={
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--ring)]/25 bg-[var(--bg-secondary)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-primary)]">
          <Settings2 className="h-3.5 w-3.5" />
          Settings
        </div>
      }
      contentClassName="overflow-auto"
    >
      <section className="grid min-h-0 flex-1 gap-4 md:grid-cols-2">
        <article className="rounded-[1.75rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--shadow-md)]">
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)] text-[var(--text-primary)]">
            <MoonStar className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Theme</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Switch between light and dark modes for the desktop and mobile dashboards.</p>
          <div className="mt-5 flex items-center gap-3">
            <ThemeToggle />
            <span className="text-sm text-[var(--text-tertiary)]">Toggle your current color theme</span>
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--shadow-md)]">
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)] text-[var(--text-primary)]">
            <Languages className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Language</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Choose the language used across the Plantify dashboard and field tools.</p>
          <div className="mt-5 flex items-center gap-3">
            <LanguageModalButton compact={false} />
          </div>
        </article>
      </section>
    </DashboardShell>
  );
}
