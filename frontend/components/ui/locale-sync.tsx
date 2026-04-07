"use client";

import {useEffect} from "react";
import {useLocale} from "next-intl";

import {usePathname, useRouter} from "@/i18n/navigation";
import {routing} from "@/i18n/routing";

const LOCALE_STORAGE_KEY = "plantify.locale";

export function LocaleSync() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const storedLocaleRaw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    const storedLocale = storedLocaleRaw?.trim() ?? "";

    if (!storedLocale) {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      return;
    }

    if (!routing.locales.includes(storedLocale as (typeof routing.locales)[number])) {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      return;
    }

    if (storedLocale === locale) {
      return;
    }

    router.replace(pathname, {locale: storedLocale});
  }, [locale, pathname, router]);

  return null;
}
