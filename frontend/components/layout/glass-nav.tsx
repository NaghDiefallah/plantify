"use client";

import {useEffect, useState} from "react";
import {usePathname} from "next/navigation";
import {useTranslations} from "next-intl";
import {Menu, X} from "lucide-react";

import {LocaleSwitcher} from "@/components/ui/locale-switcher";
import {ThemeToggle} from "@/components/ui/theme-toggle";
import {AUTH_STATE_CHANGED_EVENT, getStoredAccessToken} from "@/lib/api";
import {toAppHref} from "@/lib/app-href";
import {AppLink} from "@/components/app-link";

export function GlassNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
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
      <nav className="glass-nav mx-auto w-full max-w-7xl rounded-2xl px-4 py-3 md:px-6">
        <div className="flex items-center justify-between gap-3">
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

          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle />
            <LocaleSwitcher />
            {isLoggedIn ? (
              <AppLink
                href={toAppHref("/dashboard")}
                className="rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 [background:var(--accent)] [color:var(--accent-foreground)]"
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
                  className="rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 [background:var(--accent)] [color:var(--accent-foreground)]"
                >
                  {t("register")}
                </AppLink>
              </>
            )}
          </div>

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-primary)] md:hidden"
            onClick={() => setMobileOpen((current) => !current)}
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        <div className={mobileOpen ? "mt-4 space-y-3 border-t border-[var(--card-border)] pt-4 md:hidden" : "hidden md:hidden"}>
          {links.map((link) =>
            isHomePage && link.hash ? (
              <a
                key={link.href}
                href={link.hash}
                className="block rounded-lg px-3 py-2 text-sm tracking-[0.08em] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ) : (
              <AppLink
                key={link.href}
                href={toAppHref(link.href)}
                className="block rounded-lg px-3 py-2 text-sm tracking-[0.08em] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </AppLink>
            )
          )}
        </div>

        <div className={mobileOpen ? "mt-3 flex flex-wrap items-center gap-2 md:hidden" : "hidden md:hidden"}>
          <ThemeToggle />
          <LocaleSwitcher />
          {isLoggedIn ? (
            <AppLink
              href={toAppHref("/dashboard")}
              className="rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 [background:var(--accent)] [color:var(--accent-foreground)]"
              onClick={() => setMobileOpen(false)}
            >
              {t("dashboard")}
            </AppLink>
          ) : (
            <>
              <AppLink
                href={toAppHref("/login")}
                className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-secondary)]"
                onClick={() => setMobileOpen(false)}
              >
                {t("login")}
              </AppLink>
              <AppLink
                href={toAppHref("/register")}
                className="rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 [background:var(--accent)] [color:var(--accent-foreground)]"
                onClick={() => setMobileOpen(false)}
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
