"use client";

import {useEffect, useMemo, useState} from "react";
import {AlertCircle, CheckCircle2, Code2, Info, Loader2, ShieldCheck, Users, X} from "lucide-react";
import {useLocale, useTranslations} from "next-intl";

import type {UserProfile, UserRole} from "@/lib/types";
import {
  clearStoredTokens,
  fetchProfile,
  fetchUsers,
  getStoredAccessToken,
  getStoredRole,
  logoutCurrentSession,
  storeUserRole,
  updateUserRole
} from "@/lib/api";
import {Button} from "@/components/ui/button";
import {FarmerDashboard} from "@/components/farmer/farmer-dashboard";
import {DashboardSidebar, type DashboardNavItem} from "@/components/dashboard/dashboard-sidebar";
import {LocaleSwitcher} from "@/components/ui/locale-switcher";
import {ThemeToggle} from "@/components/ui/theme-toggle";
import {cn} from "@/lib/utils";

type NoticeKind = "error" | "success" | "info" | "warn";

type Notice = {
  id: number;
  kind: NoticeKind;
  message: string;
};

function NotificationStack({
  notices,
  onDismiss
}: {
  notices: Notice[];
  onDismiss: (id: number) => void;
}) {
  if (notices.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-[70] flex w-[min(90vw,24rem)] flex-col gap-2">
      {notices.map((notice) => {
        const tone =
          notice.kind === "error"
            ? "border-red-300/70 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
            : notice.kind === "success"
              ? "border-emerald-300/70 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
              : notice.kind === "warn"
                ? "border-amber-300/70 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
                : "border-sky-300/70 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200";

        const Icon =
          notice.kind === "error"
            ? AlertCircle
            : notice.kind === "success"
              ? CheckCircle2
              : Info;

        return (
          <div key={notice.id} className={cn("rounded-xl border px-3 py-2 shadow-lg backdrop-blur", tone)}>
            <div className="flex items-start gap-2">
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-sm leading-5">{notice.message}</p>
              <button
                type="button"
                onClick={() => onDismiss(notice.id)}
                className="ml-auto rounded p-1 opacity-70 transition hover:opacity-100"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FarmerPanel() {
  return <FarmerDashboard />;
}

function ExpertPanel() {
  return (
    <section id="expert-review" data-dashboard-section className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-6 md:grid-cols-3 scroll-mt-6">
      <article className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 md:col-span-2">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Review queue</h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">12 cases are waiting for expert validation. Median review time is 38 minutes.</p>
      </article>
      <article id="expert-accuracy" data-dashboard-section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 scroll-mt-6">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Accuracy snapshot</h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Current agreement with field outcomes: 96.2%.</p>
      </article>
      <article id="expert-notes" data-dashboard-section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 md:col-span-3 scroll-mt-6">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Notes</h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Focus this week: powdery mildew cluster in west region and false positive reductions on segmented samples.</p>
      </article>
    </section>
  );
}

function AdminPanel() {
  return (
    <section id="admin-overview" data-dashboard-section className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-6 md:grid-cols-4 scroll-mt-6">
      <article className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400">Active users</p>
        <p className="mt-3 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">1,284</p>
      </article>
      <article className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400">Organizations</p>
        <p className="mt-3 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">37</p>
      </article>
      <article className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400">API success</p>
        <p className="mt-3 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">99.97%</p>
      </article>
      <article className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400">Support SLA</p>
        <p className="mt-3 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">94%</p>
      </article>
    </section>
  );
}

function DeveloperPanel({user}: {user: UserProfile | null}) {
  return (
    <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-6 md:grid-cols-3">
      <article id="developer-workspace" data-dashboard-section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 scroll-mt-6">
        <div className="mb-3 inline-flex rounded-lg border border-zinc-300 p-2 dark:border-zinc-700">
          <Code2 className="h-4 w-4" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Developer Workspace</h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Access integration diagnostics, API payload checks, and release verification tools.
        </p>
      </article>
      <article id="developer-environment" data-dashboard-section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 scroll-mt-6">
        <div className="mb-3 inline-flex rounded-lg border border-zinc-300 p-2 dark:border-zinc-700">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Environment Health</h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Status checks and deployment readiness for backend, model, and data services.</p>
      </article>
      <article id="developer-account" data-dashboard-section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 scroll-mt-6">
        <div className="mb-3 inline-flex rounded-lg border border-zinc-300 p-2 dark:border-zinc-700">
          <Users className="h-4 w-4" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Signed-in account</h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{user?.email ?? "No signed-in user found."}</p>
      </article>
    </section>
  );
}

function RoleManager({
  users,
  currentUser,
  onUpdate
}: {
  users: UserProfile[];
  currentUser: UserProfile | null;
  onUpdate: (userId: string, role: UserRole) => Promise<void>;
}) {
  return (
    <section id="role-management" data-dashboard-section className="mx-auto mb-6 w-full max-w-7xl px-4 scroll-mt-6">
      <article className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Role management</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          Admins and developers can update account access levels from this workspace.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="pb-2 font-medium text-zinc-500 dark:text-zinc-400">User</th>
                <th className="pb-2 font-medium text-zinc-500 dark:text-zinc-400">Email</th>
                <th className="pb-2 font-medium text-zinc-500 dark:text-zinc-400">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800/80">
                  <td className="py-3 text-zinc-900 dark:text-zinc-100">{u.full_name}</td>
                  <td className="py-3 text-zinc-600 dark:text-zinc-300">{u.email}</td>
                  <td className="py-3">
                    <select
                      className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                      value={u.role}
                      onChange={(event) => void onUpdate(u.id, event.target.value as UserRole)}
                      disabled={currentUser?.id === u.id}
                    >
                      <option value="farmer">farmer</option>
                      <option value="expert">expert</option>
                      <option value="admin">admin</option>
                      <option value="developer">developer</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

export function RoleDashboard() {
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const rtl = locale === "ar";
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [redirecting, setRedirecting] = useState<boolean>(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("overview");
  const [notices, setNotices] = useState<Notice[]>([]);

  const pushNotice = (kind: NoticeKind, message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 10000);
    setNotices((prev) => [...prev, {id, kind, message}]);
    window.setTimeout(() => {
      setNotices((prev) => prev.filter((notice) => notice.id !== id));
    }, 5000);
  };

  const navItems = useMemo<DashboardNavItem[]>(() => {
    if (role === "farmer") {
      return [
        {id: "scan", label: "Scan", icon: "leaf"},
        {id: "analyze", label: "Analyze", icon: "activity"},
        {id: "act", label: "Act", icon: "clipboard"},
        {id: "scan-history", label: t("history.title"), icon: "history", href: "/scan-history"}
      ];
    }

    if (role === "expert") {
      return [
        {id: "expert-review", label: "Review queue", icon: "clipboard"},
        {id: "expert-accuracy", label: "Accuracy snapshot", icon: "shield"},
        {id: "expert-notes", label: "Notes", icon: "message"}
      ];
    }

    if (role === "admin") {
      return [
        {id: "admin-overview", label: "Operations overview", icon: "activity"},
        {id: "role-management", label: "Role management", icon: "users"}
      ];
    }

    if (role === "developer") {
      return [
        {id: "developer-workspace", label: "Workspace", icon: "flask"},
        {id: "developer-environment", label: "Environment", icon: "shield"},
        {id: "developer-account", label: "Account", icon: "users"},
        {id: "role-management", label: "Role management", icon: "users"}
      ];
    }

    return [];
  }, [role, t]);

  useEffect(() => {
    if (navItems.length > 0) {
      setActiveSection((current) => (navItems.some((item) => item.id === current) ? current : navItems[0].id));
    }
  }, [navItems]);

  useEffect(() => {
    if (navItems.length === 0) return;

    const sections = navItems
      .filter((item) => !item.href)
      .map((item) => document.getElementById(item.id))
      .filter((node): node is HTMLElement => Boolean(node));

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (visible?.target.id) {
          setActiveSection(visible.target.id);
        }
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.2, 0.4, 0.6]
      }
    );

    for (const section of sections) {
      observer.observe(section);
    }

    return () => observer.disconnect();
  }, [navItems, role]);

  useEffect(() => {
    setSidebarCollapsed(window.localStorage.getItem("plantify-dashboard-sidebar-collapsed") === "true");

    const cachedRole = getStoredRole();
    if (cachedRole) {
      setRole(cachedRole);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("plantify-dashboard-sidebar-collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    let cancelled = false;
    let minLoadingTimer: NodeJS.Timeout | null = null;

    const run = async () => {
      try {
        const accessToken = getStoredAccessToken();
        setToken(accessToken);
        
        if (!accessToken) {
          if (!cancelled) {
            clearStoredTokens();
            setRedirecting(true);
            pushNotice("warn", "Session missing. Redirecting to login...");
            // Use setTimeout to ensure redirect happens after render
            setTimeout(() => {
              if (!cancelled) {
                window.location.replace("/login");
              }
            }, 0);
          }
          return;
        }

        const profile = await fetchProfile(accessToken);
        if (cancelled) return;

        setUser(profile);
        setRole(profile.role);
        storeUserRole(profile.role);

        if (profile.role === "admin" || profile.role === "developer") {
          const allUsers = await fetchUsers(accessToken);
          if (!cancelled) {
            setUsers(allUsers);
          }
        }

        // Ensure minimum loading state duration on slower networks
        if (minLoadingTimer === null) {
          minLoadingTimer = setTimeout(() => {
            if (!cancelled) {
              setLoading(false);
            }
          }, 300);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Unable to load dashboard";
          if (message.toLowerCase().includes("session expired") || message.toLowerCase().includes("unauthorized")) {
            clearStoredTokens();
            setRedirecting(true);
            pushNotice("warn", "Session expired. Redirecting to login...");
            setTimeout(() => {
              if (!cancelled) {
                window.location.replace("/login");
              }
            }, 0);
            return;
          }
          setError(message);
          pushNotice("error", message);
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      if (minLoadingTimer) {
        clearTimeout(minLoadingTimer);
      }
    };
  }, []);

  const updateRole = async (userId: string, nextRole: UserRole) => {
    if (!token) return;
    try {
      const updated = await updateUserRole({
        token,
        userId,
        payload: {role: nextRole}
      });

      setUsers((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));

      if (user?.id === updated.id) {
        setUser(updated);
        setRole(updated.role);
        storeUserRole(updated.role);
      }
      pushNotice("success", `Role updated to ${updated.role}.`);
    } catch (err) {
      pushNotice("error", err instanceof Error ? err.message : "Failed to update role.");
    }
  };

  // Redirect in progress — render nothing so no content flashes before navigation.
  if (redirecting) return null;

  // Only block on a loading spinner when we have no cached role to display yet.
  if (loading && role === null) {
    return (
      <main className="flex min-h-[100svh] items-center justify-center px-4">
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-5 py-4 text-sm text-[var(--text-secondary)] shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--accent-primary)]" />
          <span>Loading dashboard...</span>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10">
        <NotificationStack notices={notices} onDismiss={(id) => setNotices((prev) => prev.filter((notice) => notice.id !== id))} />
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 text-sm text-[var(--text-secondary)]">
          <p>{error}</p>
          <Button
            type="button"
            className="mt-4"
            onClick={async () => {
              try {
                await logoutCurrentSession();
              } catch {
                pushNotice("warn", "Could not terminate session cleanly. Redirecting anyway.");
              }
              window.location.href = "/login";
            }}
          >
            Go to login
          </Button>
        </div>
      </main>
    );
  }

  return (
    <div
      className={cn(
        "min-h-screen bg-[var(--bg-primary)] transition-[padding] duration-300",
        rtl
          ? sidebarCollapsed
            ? "lg:pr-24"
            : "lg:pr-[22rem]"
          : sidebarCollapsed
            ? "lg:pl-24"
            : "lg:pl-[22rem]"
      )}
    >
      <NotificationStack notices={notices} onDismiss={(id) => setNotices((prev) => prev.filter((notice) => notice.id !== id))} />
      {rtl ? null : (
        <DashboardSidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
          navItems={navItems}
          activeSection={activeSection}
          onSectionNavigate={setActiveSection}
        />
      )}
      <main className="min-w-0 px-4 pb-8 pt-4 md:px-6">
        <div className="mx-auto max-w-7xl">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)] text-sm font-semibold text-[var(--text-primary)]">
                {(user?.full_name || user?.email || "U").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{user?.full_name || user?.email || "User"}</p>
                {role ? <p className="text-xs text-[var(--text-tertiary)]">{t(`sidebar.role.${role}`)}</p> : null}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LocaleSwitcher />
            </div>
          </header>

          {role === "expert" ? <ExpertPanel /> : null}
          {role === "admin" ? <AdminPanel /> : null}
          {role === "developer" ? <DeveloperPanel user={user} /> : null}
          {role === "farmer" ? <FarmerPanel /> : null}

          {role === "admin" || role === "developer" ? (
            <RoleManager users={users} currentUser={user} onUpdate={updateRole} />
          ) : null}
        </div>
      </main>
      {rtl ? (
        <DashboardSidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
          navItems={navItems}
          activeSection={activeSection}
          onSectionNavigate={setActiveSection}
        />
      ) : null}
    </div>
  );
}
