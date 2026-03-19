"use client";

import {ArrowRight, Check, Loader2} from "lucide-react";
import Link from "next/link";
import {useLocale} from "next-intl";
import {useRouter} from "next/navigation";
import {FormEvent, useState} from "react";

import {signup} from "@/lib/api";
import {Button} from "@/components/ui/button";
import {Card} from "@/components/ui/card";
import {FloatingField} from "@/components/auth/floating-field";

export default function RegisterPage() {
  const router = useRouter();
  const locale = useLocale();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setSuccess(false);
    setError(null);

    try {
      await signup({
        email,
        password,
        full_name: fullName
      });
      setSuccess(true);
      setTimeout(() => router.push(`/${locale}/login`), 450);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-gradient-to-b from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-950 dark:to-black">
      <div className="pointer-events-none absolute -right-36 top-8 h-80 w-80 rounded-full bg-emerald-300/30 blur-3xl dark:bg-emerald-700/20" />
      <div className="pointer-events-none absolute -left-40 bottom-0 h-72 w-72 rounded-full bg-lime-300/25 blur-3xl dark:bg-lime-700/15" />

      <div className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-md items-center px-4 py-10">
        <Card className="w-full rounded-3xl border border-zinc-200 bg-white p-7 shadow-xl shadow-zinc-900/5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Register</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Fill in your details to create an account.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <FloatingField
              label="Full name"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              required
            />
            <FloatingField
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              required
            />
            <p className="-mt-1 text-xs text-zinc-500 dark:text-zinc-400">Use a valid email format, for example name@domain.com.</p>
            <FloatingField
              label="Password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              required
            />
            <p className="-mt-1 text-xs text-zinc-500 dark:text-zinc-400">Minimum 8 characters.</p>

            <Button type="submit" className="mt-1 h-11 w-full gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : success ? (
                <>
                  <Check className="h-4 w-4" />
                  Account created
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
            {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">{error}</p> : null}
          </form>

          <p className="mt-5 text-sm text-zinc-600 dark:text-zinc-300">
            Already have an account? <Link href={`/${locale}/login`} className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">Sign in</Link>
          </p>
        </Card>
      </div>
    </main>
  );
}
