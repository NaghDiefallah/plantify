"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {useLocale, useTranslations} from "next-intl";
import {useEffect, useState} from "react";

import {LocaleSwitcher} from "@/components/ui/locale-switcher";
import {ThemeToggle} from "@/components/ui/theme-toggle";
import {getStoredAccessToken, logoutCurrentSession} from "@/lib/api";

export function GlassNav() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
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
    {label: "Home", href: `/${locale}`},
    {label: "Mission", href: `/${locale}#mission`},
    {label: "Testimonials", href: `/${locale}#testimonials`},
    {label: "Team", href: `/${locale}#team`},
    {label: "Dashboard", href: `/${locale}/dashboard`}
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-zinc-200/80 bg-white/80 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-[#0a0a0a]/80">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href={`/${locale}`}
          className="font-headline text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
        >
          Plantify
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-body text-sm tracking-tight text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <LocaleSwitcher />
          {isLoggedIn ? (
            <button
              type="button"
              onClick={async () => {
                await logoutCurrentSession();
                setIsLoggedIn(false);
                router.push(`/${locale}/login`);
              }}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Sign out
            </button>
          ) : (
            <Link
              href={`/${locale}/register`}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {t("register")}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
