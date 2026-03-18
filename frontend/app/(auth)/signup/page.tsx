"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { signup } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signup({ email, full_name: fullName, password });
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <Card className="w-full">
        <h1 className="text-2xl font-bold">Create your Plantify account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track every scan, confidence trend, and treatment recommendation.</p>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating account..." : "Create account"}
          </Button>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </form>
      </Card>
    </main>
  );
}
