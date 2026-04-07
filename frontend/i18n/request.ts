import {getRequestConfig} from "next-intl/server";
import arMessages from "@/messages/ar.json";
import enMessages from "@/messages/en.json";
import esMessages from "@/messages/es.json";
import hiMessages from "@/messages/hi.json";
import zhMessages from "@/messages/zh.json";

import {routing} from "./routing";

export default getRequestConfig(async ({requestLocale}) => {
  const isBuildPhase =
    process.env.NEXT_PHASE === "phase-production-build" || process.env.PLATFORM_TARGET === "static";

  const staticLocale = process.env.NEXT_PUBLIC_STATIC_LOCALE ?? routing.defaultLocale;

  let resolvedLocale: (typeof routing.locales)[number];
  if (isBuildPhase) {
    resolvedLocale = routing.locales.includes(staticLocale as (typeof routing.locales)[number])
      ? (staticLocale as (typeof routing.locales)[number])
      : routing.defaultLocale;
  } else {
    const locale = await requestLocale;
    resolvedLocale = routing.locales.includes(locale as (typeof routing.locales)[number])
      ? (locale as (typeof routing.locales)[number])
      : routing.defaultLocale;
  }

  const messagesByLocale = {
    en: enMessages,
    zh: zhMessages,
    hi: hiMessages,
    es: esMessages,
    ar: arMessages
  };

  return {
    locale: resolvedLocale,
    messages: messagesByLocale[resolvedLocale]
  };
});
