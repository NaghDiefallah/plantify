"use client";

import {FormEvent, useState} from "react";
import {ArrowRight, KeyRound, Loader2, ShieldCheck} from "lucide-react";
import {useRouter} from "next/navigation";

import {Button} from "@/components/ui/button";
import {Card} from "@/components/ui/card";
import {getStoredAccessToken, redeemRoleByCode, storeUserRole} from "@/lib/api";
import type {UserRole} from "@/lib/types";

const ROLE_CODE = "q*$e3P$NbB7JuUuDg";

export default function AuthCodePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [role, setRole] = useState<UserRole>("farmer");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (code !== ROLE_CODE) {
      setVerified(false);
      setError("Invalid authorization code.");
      return;
    }

    setVerified(true);
  };

  const applyRole = async () => {
    setError(null);
    const token = getStoredAccessToken();
    if (!token) {
      setError("You need to be signed in first.");
      return;
    }

    setLoading(true);
    try {
      const profile = await redeemRoleByCode({
        token,
        payload: {
          code: ROLE_CODE,
          role
        }
      });
      storeUserRole(profile.role);
      router.push("/en/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-4">
      <Card className="w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
          <KeyRound className="h-3.5 w-3.5" />
          Authorization Console
        </div>

        <h1 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-zinc-100">Enter authorization code</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Use the private code to unlock role selection.</p>

        <form onSubmit={unlock} className="mt-5 space-y-4">
          <label className="block text-sm text-zinc-600 dark:text-zinc-300">
            Password
            <input
              type="password"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              placeholder="Enter authorization code"
              required
            />
          </label>
          <Button type="submit" className="h-11 w-full gap-2">
            Unlock
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        {verified ? (
          <div className="mt-6 space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950">
            <label className="block text-sm text-zinc-600 dark:text-zinc-300">
              Role
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as UserRole)}
                className="mt-2 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="farmer">farmer</option>
                <option value="expert">expert</option>
                <option value="admin">admin</option>
                <option value="developer">developer</option>
              </select>
            </label>
            <Button type="button" className="h-11 w-full gap-2" onClick={applyRole}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Applying role...
                </>
              ) : (
                <>
                  Apply role
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        ) : null}

        {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">{error}</p> : null}

        <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          Role change applies to the currently authenticated account.
        </div>
      </Card>
    </main>
  );
}
