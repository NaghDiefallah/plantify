"use client";

import Link from "next/link";
import {useLocale, useTranslations} from "next-intl";
import {useEffect, useState} from "react";

import {LocaleSwitcher} from "@/components/ui/locale-switcher";
import {ThemeToggle} from "@/components/ui/theme-toggle";
import {getStoredAccessToken} from "@/lib/api";

export function GlassNav() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const syncAuth = () => {
      setIsLoggedIn(Boolean(getStoredAccessToken()));
    };

    syncAuth();
    window.addEventListener("storage", syncAuth);
    return () => window.removeEventListener("storage", syncAuth);
  }, []);

  const links = [
    {label: t("home"), href: `/${locale}`},
    {label: t("mission"), href: `/${locale}#mission`},
    {label: t("testimonials"), href: `/${locale}#testimonials`},
    {label: t("team"), href: `/${locale}#team`}
  ];

  return (
    <header className="sticky top-4 z-50 px-4 md:px-6">
      <nav className="glass-nav mx-auto flex w-full max-w-7xl items-center justify-between rounded-2xl px-4 py-3 md:px-6">
        <Link
          href={`/${locale}`}
          className="text-lg font-semibold tracking-tight text-[var(--text-primary)] md:text-xl"
        >
          Plantify
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm tracking-[0.08em] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LocaleSwitcher />
          {isLoggedIn ? (
            <Link
              href={`/${locale}/dashboard`}
              className="rounded-lg bg-[#22c55e] px-4 py-2 text-sm font-semibold text-zinc-50 transition-transform duration-150 hover:bg-[#16a34a] hover:text-zinc-50 active:scale-[0.98]"
            >
              {t("dashboard")}
            </Link>
          ) : (
            <Link href={`/${locale}/login`} className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              {t("login")}
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
