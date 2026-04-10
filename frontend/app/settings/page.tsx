"use client";

import {Settings2} from "lucide-react";
import {useEffect, useMemo, useState} from "react";

import {DashboardSidebar, type DashboardNavItem} from "@/components/dashboard/dashboard-sidebar";
import {ThemeToggle} from "@/components/ui/theme-toggle";

export default function SettingsPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  useEffect(() => {
    setSidebarCollapsed(window.localStorage.getItem("plantify-dashboard-sidebar-collapsed") === "true");
  }, []);

  const navItems = useMemo<DashboardNavItem[]>(() => {
    return [];
  }, []);

  return (
    <div className={sidebarCollapsed ? "h-[100svh] overflow-hidden lg:pl-24" : "h-[100svh] overflow-hidden lg:pl-[22rem]"}>
      <DashboardSidebar
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        navItems={navItems}
        activeSection="settings"
      />

      <main className="flex h-[100svh] min-h-0 flex-col overflow-hidden px-4 pb-4 pt-4 md:px-6">
        <header className="mb-4 flex items-center justify-between gap-3 rounded-[1.75rem] border border-[var(--card-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,247,245,0.9))] px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:bg-[linear-gradient(135deg,rgba(24,24,27,0.96),rgba(39,39,42,0.92))]">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
            <Settings2 className="h-3.5 w-3.5" />
            Settings
          </div>
          <ThemeToggle />
        </header>

        <section className="min-h-0 flex-1 overflow-auto rounded-[1.75rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:p-8">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Settings</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Settings controls will be added here.</p>
        </section>
      </main>
    </div>
  );
}
