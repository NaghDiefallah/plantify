"use client";

import type {ReactNode} from "react";
import {useEffect, useState} from "react";
import {Settings} from "lucide-react";

import {usePathname} from "@/i18n/navigation";
import {DashboardSidebar, type DashboardNavItem} from "@/components/dashboard/dashboard-sidebar";
import {DesktopTitleBar} from "@/components/layout/DesktopTitleBar";
import {LocaleSwitcher} from "@/components/ui/locale-switcher";
import {ThemeToggle} from "@/components/ui/theme-toggle";
import {toAppHref} from "@/lib/app-href";
import {isDesktopShell} from "@/lib/platform";
import {cn} from "@/lib/utils";
import {AppLink} from "@/components/app-link";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "plantify-dashboard-sidebar-collapsed";

function getInitialSidebarCollapsed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

type DashboardShellProps = {
  navItems: DashboardNavItem[];
  activeSection: string;
  topBarLead: ReactNode;
  children: ReactNode;
  onSectionNavigate?: (sectionId: string) => void;
  contentClassName?: string;
  pageClassName?: string;
  topBarClassName?: string;
  showLocaleSwitcher?: boolean;
};

export function DashboardShell({
  navItems,
  activeSection,
  topBarLead,
  children,
  onSectionNavigate,
  contentClassName,
  pageClassName,
  topBarClassName,
  showLocaleSwitcher = true
}: DashboardShellProps) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(getInitialSidebarCollapsed);
  const [desktopShell, setDesktopShell] = useState(false);

  useEffect(() => {
    setDesktopShell(isDesktopShell());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(sidebarCollapsed));
    } catch {
      // Ignore persistence failures (private mode/storage restrictions).
    }
  }, [sidebarCollapsed]);

  const shellPaddingClass = sidebarCollapsed ? "lg:pl-24" : "lg:pl-[22rem]";

  const sidebar = (
    <DashboardSidebar
      collapsed={sidebarCollapsed}
      onCollapsedChange={setSidebarCollapsed}
      navItems={navItems}
      activeSection={activeSection}
      onSectionNavigate={onSectionNavigate}
    />
  );

  return (
    <div className={cn("relative min-h-[100dvh] overflow-hidden bg-[var(--bg-primary)]", shellPaddingClass)}>
      {sidebar}

      <main className={cn("min-w-0 px-4 pb-4 pt-4 md:px-6 min-h-[100dvh]", pageClassName)}>
        <div className="mx-auto flex h-full w-full max-w-7xl flex-col">
          {desktopShell ? <DesktopTitleBar className="mb-4 shrink-0" title="Plantify" subtitle="Desktop Workspace" /> : null}

          <header
            className={cn(
              "mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3 shadow-[var(--shadow-sm)]",
              topBarClassName
            )}
          >
            <div className="min-w-0">{topBarLead}</div>

            <div className="flex items-center gap-2">
              <AppLink
                href={toAppHref("/settings")}
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
                  pathname === "/settings"
                    ? "border-[var(--ring)]/30 bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                    : "border-[var(--card-border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:opacity-90"
                )}
                aria-label="Open settings"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </AppLink>
              <ThemeToggle />
              {showLocaleSwitcher ? <LocaleSwitcher /> : null}
            </div>
          </header>

          <div className={cn("min-h-0 flex-1", contentClassName)}>{children}</div>
        </div>
      </main>
    </div>
  );
}