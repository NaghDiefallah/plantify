import type {ReactNode} from "react";
import {NextIntlClientProvider, hasLocale} from "next-intl";
import {getMessages, setRequestLocale} from "next-intl/server";
import {notFound} from "next/navigation";

import {GlassNav} from "@/components/layout/glass-nav";
import {AppProviders} from "@/components/providers/app-providers";
import {routing} from "@/i18n/routing";

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
  const messages = await getMessages();
  const rtl = locale === "ar";

  return (
    <NextIntlClientProvider messages={messages}>
      <AppProviders>
        <div dir={rtl ? "rtl" : "ltr"} className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
          <GlassNav />
          {children}
        </div>
      </AppProviders>
    </NextIntlClientProvider>
  );
}
