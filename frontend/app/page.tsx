import Link from "next/link";

import { BentoGrid } from "@/components/dashboard/bento-grid";

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-emerald-300/80">Plantify Intelligence</p>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Bento Plant Health Command Center</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Upload leaf images, run ONNX inference, and manage disease detection history in one polished dashboard.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/login" className="rounded-xl border border-border bg-black/25 px-4 py-2 text-sm font-medium">
            Login
          </Link>
          <Link href="/signup" className="rounded-xl border border-emerald-300/40 bg-emerald-300 px-4 py-2 text-sm font-semibold text-black">
            Create account
          </Link>
        </div>
      </header>
      <BentoGrid />
    </main>
  );
}
