"use client";

import {useEffect, useState} from "react";
import {usePathname} from "next/navigation";
import {useTranslations} from "next-intl";

import {LocaleSwitcher} from "@/components/ui/locale-switcher";
import {ThemeToggle} from "@/components/ui/theme-toggle";
import {AUTH_STATE_CHANGED_EVENT, getStoredAccessToken} from "@/lib/api";
import {toAppHref} from "@/lib/app-href";
import {AppLink} from "@/components/app-link";

export function GlassNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const isDashboardPage = pathname.includes("/dashboard");
  const isHomePage = pathname === "/";

  useEffect(() => {
    const syncAuth = () => {
      setIsLoggedIn(Boolean(getStoredAccessToken()));
    };

    syncAuth();
    window.addEventListener("storage", syncAuth);
    window.addEventListener(AUTH_STATE_CHANGED_EVENT, syncAuth);
    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener(AUTH_STATE_CHANGED_EVENT, syncAuth);
    };
  }, []);

  if (isDashboardPage) {
    return null;
  }

  const links = [
    {label: t("home"), href: "/", hash: ""},
    {label: t("mission"), href: "/#mission", hash: "#mission"},
    {label: t("testimonials"), href: "/#testimonials", hash: "#testimonials"},
    {label: t("team"), href: "/#team", hash: "#team"}
  ];

  return (
    <header className="sticky top-3 z-50 px-4 md:px-6">
      <nav className="glass-nav mx-auto flex w-full max-w-7xl items-center justify-between rounded-2xl px-4 py-3 md:px-6">
        <AppLink href={toAppHref("/")} className="text-lg font-semibold tracking-tight text-[var(--text-primary)] md:text-xl">
          Plantify
        </AppLink>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) =>
            isHomePage && link.hash ? (
              <a
                key={link.href}
                href={link.hash}
                className="text-sm tracking-[0.08em] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                {link.label}
              </a>
            ) : (
              <AppLink
                key={link.href}
                href={toAppHref(link.href)}
                className="text-sm tracking-[0.08em] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                {link.label}
              </AppLink>
            )
          )}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LocaleSwitcher />
          {isLoggedIn ? (
            <AppLink
              href={toAppHref("/dashboard")}
              className="rounded-lg bg-[#22c55e] px-4 py-2 text-sm font-semibold text-zinc-50 transition-transform duration-150 hover:bg-[#16a34a] hover:text-zinc-50 active:scale-[0.98]"
            >
              {t("dashboard")}
            </AppLink>
          ) : (
            <>
              <AppLink
                href={toAppHref("/login")}
                className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-secondary)]"
              >
                {t("login")}
              </AppLink>
              <AppLink
                href={toAppHref("/register")}
                className="rounded-lg bg-[#22c55e] px-4 py-2 text-sm font-semibold text-zinc-50 transition-transform duration-150 hover:bg-[#16a34a] hover:text-zinc-50 active:scale-[0.98]"
              >
                {t("register")}
              </AppLink>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
