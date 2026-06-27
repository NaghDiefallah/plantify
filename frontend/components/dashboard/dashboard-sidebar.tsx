"use client";

import {
  Activity,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FlaskConical,
  History,
  Home,
  Leaf,
  LogOut,
  Menu,
  MessageSquareHeart,
  Scale,
  Settings2,
  ShieldCheck,
  Users,
  X
} from "lucide-react";
import {useEffect, useState} from "react";
import {useLocale} from "next-intl";

import {usePathname} from "@/i18n/navigation";
import {getStoredAccessToken, logoutCurrentSession} from "@/lib/api";
import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utils";
import {AppLink} from "@/components/app-link";

export type DashboardNavItem = {
  id: string;
  label: string;
  icon: "activity" | "clipboard" | "flask" | "history" | "leaf" | "message" | "shield" | "users";
  href?: string;
};

type SidebarEntry = {
  id: string;
  label: string;
  icon: ReturnType<typeof iconForNavItem>;
  href?: string;
  sectionId?: string;
};

const QUICK_LINKS: SidebarEntry[] = [
  {id: "dashboard", label: "Home", href: "/dashboard", icon: Home},
  {id: "chat", label: "Chat", href: "/chat", icon: MessageSquareHeart},
  {id: "community", label: "Community", href: "/community", icon: Users},
  {id: "history", label: "History", href: "/scan-history", icon: History},
  {id: "settings", label: "Settings", href: "/settings", icon: Settings2}
];

function iconForNavItem(icon: DashboardNavItem["icon"]) {
  switch (icon) {
    case "activity":
      return Activity;
    case "clipboard":
      return ClipboardCheck;
    case "flask":
      return FlaskConical;
    case "history":
      return History;
    case "leaf":
      return Leaf;
    case "message":
      return MessageSquareHeart;
    case "shield":
      return ShieldCheck;
    case "users":
      return Users;
    default:
      return Settings2;
  }
}

function isEntryActive(entry: SidebarEntry, pathname: string, activeSection: string) {
  if (entry.href) {
    return pathname === entry.href || pathname.startsWith(`${entry.href}/`) || pathname.startsWith(`${entry.href}#`);
  }

  if (entry.sectionId) {
    return activeSection === entry.sectionId;
  }

  return false;
}

function SidebarNavItem({
  collapsed,
  active,
  entry,
  onSelect
}: {
  collapsed: boolean;
  active: boolean;
  entry: SidebarEntry;
  onSelect: () => void;
}) {
  const Icon = entry.icon;
  const content = (
    <>
      <Icon className="h-4 w-4 shrink-0" />
      {collapsed ? null : <span className="truncate font-semibold">{entry.label}</span>}
      {collapsed ? (
        <span className="pointer-events-none absolute left-full top-1/2 z-[120] ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] shadow-lg group-hover:block rtl:left-auto rtl:right-full rtl:ml-0 rtl:mr-3">
          {entry.label}
        </span>
      ) : null}
    </>
  );

  const className = cn(
    "group relative flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all",
    active
      ? "border-[#22c55e]/35 bg-[#22c55e]/10 text-[var(--text-primary)] shadow-[0_0_0_1px_rgba(34,197,94,0.18)]"
      : "border-transparent bg-[var(--bg-secondary)]/55 text-[var(--text-secondary)] hover:border-[var(--card-border)] hover:bg-[var(--bg-secondary)]",
    collapsed && "h-11 w-11 justify-center rounded-full px-0 py-0"
  );

  if (entry.href) {
    return (
      <AppLink href={entry.href} className={className} aria-current={active ? "location" : undefined} onClick={onSelect}>
        {content}
      </AppLink>
    );
  }

  return (
    <button type="button" onClick={onSelect} className={className} aria-current={active ? "location" : undefined}>
      {content}
    </button>
  );
}

function SidePanelContent({
  collapsed,
  navItems,
  activeSection,
  onToggleCollapsed,
  onNavigate,
  pathname,
  onCloseMobile
}: {
  collapsed: boolean;
  navItems: DashboardNavItem[];
  activeSection: string;
  onToggleCollapsed: () => void;
  onNavigate: (sectionId: string) => void;
  pathname: string;
  onCloseMobile: () => void;
}) {
  const dashboardLabel = "Plantify";
  const logoutLabel = "Logout";
  const workflowEntries: SidebarEntry[] = navItems
    .filter((item) => !["scan", "analyze", "act", "scan-history"].includes(item.id))
    .map((item) => ({
      id: item.id,
      label: item.label,
      icon: iconForNavItem(item.icon),
      href: item.href,
      sectionId: item.href ? undefined : item.id
    }));

  const handleSelect = (entry: SidebarEntry) => {
    if (entry.sectionId) {
      onNavigate(entry.sectionId);
      return;
    }

    onCloseMobile();
  };

  return (
    <div className={cn("flex h-full flex-col gap-4 p-4", collapsed && "items-center px-3")}>
      <div
        className={cn(
          "w-full rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-3 shadow-[var(--shadow-sm)]",
          collapsed && "w-auto rounded-full p-2"
        )}
      >
        <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between")}> 
          {collapsed ? null : (
            <div className="flex items-center gap-3">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#22c55e] text-white">
                <Scale className="h-4 w-4" />
              </div>
              <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Workspace</p>
              <span className="mt-1 block text-base font-semibold text-[var(--text-primary)]">{dashboardLabel}</span>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] transition hover:opacity-90"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className={cn("w-full space-y-3", collapsed && "w-auto space-y-2")}> 
        {workflowEntries.length > 0 ? (
          <div className={cn("rounded-[1.3rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-3 shadow-[var(--shadow-sm)]", collapsed && "border-none bg-transparent p-0 shadow-none")}>
            {collapsed ? null : <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Workflow</p>}
            <ul className={cn("space-y-2", collapsed ? "flex flex-col items-center gap-2 space-y-0" : "mt-2")}>
              {workflowEntries.map((entry) => (
                <li key={entry.id} className="w-full">
                  <SidebarNavItem
                    collapsed={collapsed}
                    active={isEntryActive(entry, pathname, activeSection)}
                    entry={entry}
                    onSelect={() => handleSelect(entry)}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className={cn("rounded-[1.3rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-3 shadow-[var(--shadow-sm)]", collapsed && "border-none bg-transparent p-0 shadow-none")}>
          {collapsed ? null : <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Navigate</p>}
          <ul className={cn("space-y-2", collapsed ? "flex flex-col items-center gap-2 space-y-0" : "mt-2")}>
            {QUICK_LINKS.map((entry) => (
              <li key={entry.id} className="w-full">
                <SidebarNavItem
                  collapsed={collapsed}
                  active={isEntryActive(entry, pathname, activeSection)}
                  entry={entry}
                  onSelect={() => handleSelect(entry)}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex-1" />

      <Button
        type="button"
        onClick={async () => {
          const token = getStoredAccessToken();
          if (token) {
            await logoutCurrentSession();
          }
          onCloseMobile();
          window.location.href = "/login";
        }}
        title={collapsed ? logoutLabel : undefined}
        className={cn(
          "mb-14 w-full gap-2 rounded-2xl bg-red-600 text-white hover:bg-red-700 active:scale-[0.98] lg:mb-0",
          collapsed && "h-10 w-10 rounded-full p-0"
        )}
      >
        <LogOut className="h-4 w-4" />
        {collapsed ? null : logoutLabel}
      </Button>
    </div>
  );
}

export function DashboardSidebar({
  collapsed,
  onCollapsedChange,
  navItems,
  activeSection,
  onSectionNavigate
}: {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  navItems: DashboardNavItem[];
  activeSection: string;
  onSectionNavigate?: (sectionId: string) => void;
}) {
  const locale = useLocale();
  const pathname = usePathname();
  const rtl = locale === "ar";
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const effectiveCollapsed = isDesktop ? collapsed : false;

  useEffect(() => {
    const updateDesktopState = () => {
      setIsDesktop(window.matchMedia("(min-width: 1024px)").matches);
    };

    updateDesktopState();
    window.addEventListener("resize", updateDesktopState);
    return () => window.removeEventListener("resize", updateDesktopState);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  const navigateToSection = (sectionId: string) => {
    onSectionNavigate?.(sectionId);
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.scrollIntoView({behavior: "smooth", block: "start"});
    window.history.replaceState(null, "", `#${sectionId}`);
    setIsOpen(false);
  };

  return (
    <>
      <div className={cn("fixed bottom-6 z-40 block lg:hidden", rtl ? "right-6" : "left-6")}>
        <Button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="h-12 w-12 rounded-full p-3 hover:opacity-90 [background:var(--accent)] [color:var(--accent-foreground)]"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {isOpen ? <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setIsOpen(false)} /> : null}

      <aside
        className={cn(
          "fixed inset-y-0 z-[60] w-[min(86vw,21rem)] transform bg-[var(--bg-primary)] transition-[transform,width] duration-300 ease-in-out lg:left-0 lg:border-r lg:border-[var(--card-border)] lg:w-[22rem]",
          effectiveCollapsed ? "lg:w-24" : "lg:w-[22rem]",
          isDesktop
            ? "left-0 border-r border-[var(--card-border)] translate-x-0"
            : rtl
              ? cn("right-0 border-l border-[var(--card-border)]", isOpen ? "translate-x-0" : "translate-x-full")
              : cn("left-0 border-r border-[var(--card-border)]", isOpen ? "translate-x-0" : "-translate-x-full")
        )}
      >
        <div className="flex items-center justify-between border-b border-[var(--card-border)] p-4 lg:hidden">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Dashboard</h2>
          <button onClick={() => setIsOpen(false)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className={cn(
            "h-full overscroll-contain pb-6 lg:pb-0",
            effectiveCollapsed ? "overflow-visible" : "overflow-y-auto"
          )}
        >
          <SidePanelContent
            collapsed={effectiveCollapsed}
            navItems={navItems}
            activeSection={activeSection}
            onToggleCollapsed={() => {
              if (!isDesktop) return;
              onCollapsedChange(!collapsed);
            }}
            onNavigate={navigateToSection}
            pathname={pathname}
            onCloseMobile={() => setIsOpen(false)}
          />
        </div>
      </aside>
    </>
  );
}
