"use client";

import {useEffect, useMemo, useState} from "react";
import {Code2, ShieldCheck, Stethoscope, Tractor, Users} from "lucide-react";

import type {UserProfile, UserRole} from "@/lib/types";
import {
  clearStoredTokens,
  fetchProfile,
  fetchUsers,
  getStoredAccessToken,
  logoutCurrentSession,
  storeUserRole,
  updateUserRole
} from "@/lib/api";
import {Button} from "@/components/ui/button";
import {FarmerDashboard} from "@/components/farmer/farmer-dashboard";

function FarmerPanel() {
  return <FarmerDashboard />;
}

function ExpertPanel() {
  return (
    <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-6 md:grid-cols-3">
      <article className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 md:col-span-2">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Review queue</h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">12 cases are waiting for expert validation. Median review time is 38 minutes.</p>
      </article>
      <article className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Accuracy snapshot</h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Current agreement with field outcomes: 96.2%.</p>
      </article>
      <article className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 md:col-span-3">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Notes</h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Focus this week: powdery mildew cluster in west region and false positive reductions on segmented samples.</p>
      </article>
    </section>
  );
}

function AdminPanel() {
  return (
    <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-6 md:grid-cols-4">
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
      <article className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 inline-flex rounded-lg border border-zinc-300 p-2 dark:border-zinc-700">
          <Code2 className="h-4 w-4" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Developer Workspace</h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Access integration diagnostics, API payload checks, and release verification tools.
        </p>
      </article>
      <article className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 inline-flex rounded-lg border border-zinc-300 p-2 dark:border-zinc-700">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Environment Health</h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Status checks and deployment readiness for backend, model, and data services.</p>
      </article>
      <article className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
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
    <section className="mx-auto mb-6 w-full max-w-7xl px-4">
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
  const [role, setRole] = useState<UserRole | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const accessToken = getStoredAccessToken();
        setToken(accessToken);
        if (!accessToken) {
          if (!cancelled) {
            clearStoredTokens();
            setLoading(false);
            window.location.replace("/login");
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
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Unable to load dashboard";
          if (message.toLowerCase().includes("session expired") || message.toLowerCase().includes("unauthorized")) {
            clearStoredTokens();
            setLoading(false);
            window.location.replace("/login");
            return;
          }
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  const title = useMemo(() => {
    if (role === "farmer") return "Farmer Dashboard";
    if (role === "expert") return "Expert Dashboard";
    if (role === "admin") return "Admin Dashboard";
    if (role === "developer") return "Developer Dashboard";
    return "Dashboard";
  }, [role]);

  const icon = useMemo(() => {
    if (role === "farmer") return <Tractor className="h-4 w-4" />;
    if (role === "expert") return <Stethoscope className="h-4 w-4" />;
    if (role === "admin") return <ShieldCheck className="h-4 w-4" />;
    return <Code2 className="h-4 w-4" />;
  }, [role]);

  const updateRole = async (userId: string, nextRole: UserRole) => {
    if (!token) return;
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
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          Loading dashboard...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10">
        <div className="rounded-2xl border border-red-300/60 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300">
          <p>{error}</p>
          <Button
            type="button"
            className="mt-4"
            onClick={async () => {
              await logoutCurrentSession();
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
    <main>

      {role === "expert" ? <ExpertPanel /> : null}
      {role === "admin" ? <AdminPanel /> : null}
      {role === "developer" ? <DeveloperPanel user={user} /> : null}
      {role === "farmer" || !role ? <FarmerPanel /> : null}

      {role === "admin" || role === "developer" ? (
        <RoleManager users={users} currentUser={user} onUpdate={updateRole} />
      ) : null}
    </main>
  );
}
