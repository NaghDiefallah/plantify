"use client";

import Link from "next/link";
import {motion} from "framer-motion";
import {ArrowRight} from "lucide-react";
import {useLocale, useTranslations} from "next-intl";
import {CircleUserRound} from "lucide-react";

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

const TEAM_NAMES = ["Nagh", "Aya", "Hady", "Abd Elghany", "Ahmed Bahaa", "Omar Radwan"];

const fadeUp = {
  hidden: {opacity: 0, y: 20},
  show: {opacity: 1, y: 0}
};

export function VisitorLanding() {
  const locale = useLocale();
  const t = useTranslations("landing");
  const missionPoints = [
    {
      title: t("missionItem1Title"),
      body: t("missionItem1Body")
    },
    {
      title: t("missionItem2Title"),
      body: t("missionItem2Body")
    },
    {
      title: t("missionItem3Title"),
      body: t("missionItem3Body")
    }
  ];
  const team = TEAM_NAMES.map((name, index) => ({
    name,
    role: t(`teamRole${index + 1}`)
  }));

  return (
    <main className="relative mx-auto max-w-7xl px-6 pb-14 pt-16 md:px-8 md:pt-20">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[-12rem] top-0 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-16 right-[-10rem] h-72 w-72 rounded-full bg-zinc-500/10 blur-3xl" />
      </div>

      <section className="mx-auto max-w-3xl text-center">
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          transition={{duration: 0.35}}
          className="mb-4 text-xs font-semibold uppercase tracking-[0.26em] text-[var(--text-tertiary)]"
        >
            {t("eyebrow")}
          </motion.p>
        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="show"
          transition={{duration: 0.45, delay: 0.05}}
          className="text-balance text-4xl font-semibold leading-[1.08] text-[var(--text-primary)] md:text-6xl"
        >
            {t("title")}
          </motion.h1>
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          transition={{duration: 0.45, delay: 0.12}}
          className="mx-auto mt-6 max-w-2xl text-base tracking-[0.02em] text-[var(--text-secondary)] md:text-lg"
        >
            {t("subtitle")}
          </motion.p>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          transition={{duration: 0.35, delay: 0.2}}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
            <Link
              href={`/${locale}/dashboard`}
              className="inline-flex h-11 items-center rounded-lg bg-[#22c55e] px-5 text-sm font-semibold text-zinc-50 transition-transform duration-150 hover:bg-[#16a34a] hover:text-zinc-50 active:scale-[0.98]"
            >
              {t("ctaPrimary")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </motion.div>
      </section>

      <section id="mission" className="mt-20">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">{t("missionEyebrow")}</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-primary)] md:text-4xl">
            {t("missionTitle")}
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {missionPoints.map((point, index) => (
            <motion.article
              key={point.title}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{once: true, amount: 0.25}}
              transition={{duration: 0.35, delay: index * 0.06}}
              className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5"
            >
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-primary)]">{point.title}</h3>
              <p className="mt-3 text-sm text-[var(--text-secondary)]">{point.body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section id="testimonials" className="mt-20">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">{t("testimonialsEyebrow")}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text-primary)] md:text-4xl">{t("testimonialsTitle")}</h2>
        </div>

        <div className="-mx-2 flex snap-x gap-3 overflow-x-auto px-2 pb-2">
          {TESTIMONIALS.map((item, index) => (
            <motion.article
              key={item.author}
              initial={{opacity: 0, y: 20}}
              whileInView={{opacity: 1, y: 0}}
              viewport={{once: true, amount: 0.3}}
              transition={{duration: 0.35, delay: index * 0.06}}
              className="min-w-[18rem] snap-start rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 md:min-w-[22rem]"
            >
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">&quot;{item.quote}&quot;</p>
              <div className="mt-5">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{item.author}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{item.role}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <section id="team" className="mt-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">{t("teamEyebrow")}</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text-primary)] md:text-4xl">{t("teamTitle")}</h2>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((member, index) => (
            <motion.article
              key={member.name}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{once: true, amount: 0.2}}
              transition={{duration: 0.35, delay: index * 0.05}}
              className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)]">
                <CircleUserRound className="h-5 w-5 text-[var(--text-secondary)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{member.name}</p>
              <p className="text-xs text-[var(--text-tertiary)]">{member.role}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <footer className="mt-20 border-t border-[var(--card-border)] py-10">
        <div className="grid gap-6 text-sm text-[var(--text-tertiary)] md:grid-cols-4">
          <div>
            <p className="font-semibold text-[var(--text-primary)]">Plantify</p>
            <p className="mt-2">{t("footerDescription")}</p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-[var(--text-primary)]">{t("footerHeadingPlatform")}</p>
            <Link href={`/${locale}`} className="block hover:text-[var(--text-primary)]">{t("footerHome")}</Link>
            <Link href={`/${locale}/dashboard`} className="block hover:text-[var(--text-primary)]">{t("footerDashboard")}</Link>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-[var(--text-primary)]">{t("footerHeadingLegal")}</p>
            <Link href={`/${locale}/privacy`} className="block hover:text-[var(--text-primary)]">{t("footerPrivacy")}</Link>
            <Link href={`/${locale}/terms`} className="block hover:text-[var(--text-primary)]">{t("footerTerms")}</Link>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-[var(--text-primary)]">{t("footerHeadingSocial")}</p>
            <Link href="#" className="block hover:text-[var(--text-primary)]">{t("footerX")}</Link>
            <Link href="#" className="block hover:text-[var(--text-primary)]">{t("footerLinkedIn")}</Link>
            <Link href="#" className="block hover:text-[var(--text-primary)]">{t("footerContact")}</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
