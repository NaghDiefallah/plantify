import {getRequestConfig} from "next-intl/server";

import {routing} from "./routing";

export default getRequestConfig(async ({requestLocale}) => {
  const locale = await requestLocale;
  const activeLocale = routing.locales.includes(locale as (typeof routing.locales)[number])
    ? (locale as (typeof routing.locales)[number])
    : routing.defaultLocale;

  return {
    locale: activeLocale,
    messages: (await import(`../messages/${activeLocale}.json`)).default
  };
});
