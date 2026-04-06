import type {ReactNode} from "react";
import {NextIntlClientProvider, hasLocale} from "next-intl";
import {getMessages, setRequestLocale} from "next-intl/server";
import {notFound} from "next/navigation";

import {GlassNav} from "@/components/layout/glass-nav";
import {SiteFooter} from "@/components/layout/site-footer";
import {LocaleSync} from "@/components/ui/locale-sync";
import {routing} from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages({locale});
  const rtl = locale === "ar";

  return (
    <NextIntlClientProvider messages={messages}>
      <div
        dir={rtl ? "rtl" : "ltr"}
        className="flex min-h-screen flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]"
      >
        <LocaleSync />
        <GlassNav />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </NextIntlClientProvider>
  );
}
