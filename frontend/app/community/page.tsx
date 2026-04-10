"use client";

import {Users} from "lucide-react";
import {useMemo} from "react";

import {DashboardShell} from "@/components/dashboard/dashboard-shell";
import {type DashboardNavItem} from "@/components/dashboard/dashboard-sidebar";

export default function CommunityPage() {
  const navItems = useMemo<DashboardNavItem[]>(() => {
    return [];
  }, []);

  return (
    <DashboardShell
      navItems={navItems}
      activeSection="community"
      topBarLead={
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
          <Users className="h-3.5 w-3.5" />
          Community
        </div>
      }
      contentClassName="overflow-hidden"
    >
      <section className="min-h-0 flex-1 overflow-auto rounded-[1.75rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:p-8">
        <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)] text-[var(--text-primary)]">
          <Users className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Community</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          This space is now wired and reachable from the dashboard side panel. Community threads and shared cases can be added here next.
        </p>
      </section>
    </DashboardShell>
  );
}
