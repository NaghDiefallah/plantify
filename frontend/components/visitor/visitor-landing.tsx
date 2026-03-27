"use client";

import Link from "next/link";
import {motion} from "framer-motion";
import {ArrowRight, CheckCircle2} from "lucide-react";
import {useLocale} from "next-intl";

const TESTIMONIALS = [
  {
    quote: "Plantify helped our field team standardize early detection across all sites.",
    author: "Mariam Hassan",
    role: "Operations Manager"
  },
  {
    quote: "The product is fast, clear, and easy to roll out to non-technical staff.",
    author: "Khaled Mostafa",
    role: "Regional Agronomist"
  },
  {
    quote: "The interface feels modern and focused. We adopted it in one week.",
    author: "Nour El Din",
    role: "Farm Technology Lead"
  }
];

const TEAM = [
  {name: "Nagh", role: "Product Lead"},
  {name: "Aya", role: "Design Lead"},
  {name: "Hady", role: "Platform Engineer"},
  {name: "Abd Elghany", role: "Security Engineer"},
  {name: "Ahmed Bahaa", role: "Computer Vision Engineer"},
  {name: "Omar Radwan", role: "Operations Lead"}
];

const MISSION_POINTS = [
  "Design tools that make crop decisions faster and easier.",
  "Deliver consistent outputs teams can trust in daily operations.",
  "Keep workflows simple from onboarding to field execution."
];

export function VisitorLanding() {
  const locale = useLocale();

  return (
    <main className="mx-auto max-w-7xl px-6 pb-14 pt-12 md:px-8">
      <section className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-8 sm:p-10 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-zinc-200/70 blur-3xl dark:bg-zinc-700/20" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-zinc-300/50 blur-3xl dark:bg-zinc-600/20" />

        <motion.div initial={{opacity: 0, y: 16}} animate={{opacity: 1, y: 0}} transition={{duration: 0.45}} className="relative mx-auto max-w-3xl text-center">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            Plantify Platform
          </p>
          <h1 className="text-balance text-4xl font-semibold leading-tight text-zinc-900 md:text-6xl dark:text-zinc-50">
            Modern crop health operations, built for real teams.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-zinc-600 md:text-lg dark:text-zinc-300">
            Plantify brings monitoring, analysis, and collaboration into one polished workflow so your team can move from observation to action faster.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/${locale}/register`}
              className="inline-flex h-11 items-center rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Get started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href={`/${locale}/dashboard`}
              className="inline-flex h-11 items-center rounded-lg border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              View dashboard
            </Link>
          </div>
        </motion.div>
      </section>

      <section id="mission" className="mt-20 grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Mission</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl dark:text-zinc-50">
            Make high-quality crop decisions accessible to every operation.
          </h2>
        </div>
        <div className="lg:col-span-7 space-y-3">
          {MISSION_POINTS.map((point) => (
            <div key={point} className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-zinc-700 dark:text-zinc-300" />
              <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{point}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="testimonials" className="mt-20">
        <div className="mb-7 flex items-end justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Testimonials</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl dark:text-zinc-50">What teams say about Plantify</h2>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((item) => (
            <motion.article
              key={item.author}
              initial={{opacity: 0, y: 14}}
              whileInView={{opacity: 1, y: 0}}
              viewport={{once: true, amount: 0.3}}
              className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">&quot;{item.quote}&quot;</p>
              <div className="mt-5">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.author}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{item.role}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <section id="team" className="mt-20">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Team</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl dark:text-zinc-50">Small team, focused execution</h2>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEAM.map((member) => (
            <div key={member.name} className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="h-11 w-11 rounded-full bg-zinc-200 dark:bg-zinc-800" />
              <p className="mt-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">{member.name}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{member.role}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-20 border-t border-zinc-200 py-8 dark:border-zinc-800">
        <div className="flex flex-col gap-4 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between dark:text-zinc-400">
          <p>Plantify</p>
          <div className="flex items-center gap-5">
            <Link href="#" className="hover:text-zinc-900 dark:hover:text-zinc-100">Privacy</Link>
            <Link href="#" className="hover:text-zinc-900 dark:hover:text-zinc-100">Terms</Link>
            <Link href="#" className="hover:text-zinc-900 dark:hover:text-zinc-100">Contact</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
