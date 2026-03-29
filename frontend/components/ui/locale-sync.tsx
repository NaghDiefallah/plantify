"use client";

import {useEffect} from "react";
import {useLocale} from "next-intl";

import {usePathname, useRouter} from "@/i18n/navigation";

const LOCALE_STORAGE_KEY = "plantify.locale";

export function LocaleSync() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (!storedLocale || storedLocale === locale) {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      return;
    }

    router.replace(pathname, {locale: storedLocale});
  }, [locale, pathname, router]);

  useEffect(() => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  return null;
}
