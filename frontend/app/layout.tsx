import type { Metadata } from "next";
import { Sora } from "next/font/google";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import {NextIntlClientProvider} from "next-intl";
import type {AbstractIntlMessages} from "next-intl";
import arMessages from "@/messages/ar.json";
import enMessages from "@/messages/en.json";
import esMessages from "@/messages/es.json";
import hiMessages from "@/messages/hi.json";
import zhMessages from "@/messages/zh.json";

import {AppProviders} from "@/components/providers/app-providers";
import {LocaleSync} from "@/components/ui/locale-sync";
import {routing, type AppLocale} from "@/i18n/routing";
import "./globals.css";

const STATIC_EXPORT_LOCALE = (process.env.NEXT_PUBLIC_STATIC_LOCALE ?? routing.defaultLocale) as AppLocale;

const STATIC_MESSAGES_BY_LOCALE: Record<AppLocale, AbstractIntlMessages> = {
  en: enMessages,
  zh: zhMessages,
  hi: hiMessages,
  es: esMessages,
  ar: arMessages
};

const sora = Sora({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sora",
  display: "swap"
});

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  weight: ["400", "500", "600", "700"],
  subsets: ["arabic"],
  variable: "--font-plex-arabic",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Plantify - AI Plant Disease Detection",
  description: "Advanced plant disease detection and treatment recommendations powered by AI"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = routing.locales.includes(STATIC_EXPORT_LOCALE) ? STATIC_EXPORT_LOCALE : routing.defaultLocale;
  const messages = STATIC_MESSAGES_BY_LOCALE[locale];
  const rtl = locale === "ar";

  return (
    <html 
      lang={locale}
      dir={rtl ? "rtl" : "ltr"}
      className={`${sora.variable} ${ibmPlexArabic.variable}`} 
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#22c55e" />
      </head>
      <body className="antialiased">
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
          <AppProviders>
            <LocaleSync />
            {children}
          </AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
