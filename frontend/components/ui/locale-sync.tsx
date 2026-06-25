"use client";

import {useEffect} from "react";
import {useLocale} from "next-intl";

import {usePathname, useRouter} from "@/i18n/navigation";
import {routing} from "@/i18n/routing";

const LOCALE_STORAGE_KEY = "plantify.locale";
const LOCALE_COOKIE_KEY = "NEXT_LOCALE";
const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function persistLocaleCookie(nextLocale: string): void {
  const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LOCALE_COOKIE_KEY}=${encodeURIComponent(nextLocale)}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secureFlag}`;
}

export function LocaleSync() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const storedLocaleRaw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    const storedLocale = storedLocaleRaw?.trim() ?? "";

    if (!storedLocale) {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      persistLocaleCookie(locale);
      return;
    }

    if (!routing.locales.includes(storedLocale as (typeof routing.locales)[number])) {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      persistLocaleCookie(locale);
      return;
    }

    if (storedLocale === locale) {
      persistLocaleCookie(locale);
      return;
    }

    persistLocaleCookie(storedLocale);
    router.replace(pathname, {locale: storedLocale});
  }, [locale, pathname, router]);

  return null;
}
