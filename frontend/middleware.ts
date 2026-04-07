import createMiddleware from "next-intl/middleware";
import {NextRequest, NextResponse} from "next/server";

import {routing} from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

function getLocalePrefix(pathname: string): string | null {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return locale;
    }
  }

  return null;
}

export default function middleware(request: NextRequest) {
  const {pathname} = request.nextUrl;
  const localePrefix = getLocalePrefix(pathname);

  if (localePrefix) {
    const normalizedPath = pathname.slice(localePrefix.length + 1) || "/";
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = normalizedPath;

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set("NEXT_LOCALE", localePrefix, {
      path: "/",
      sameSite: "lax"
    });
    return response;
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"]
};
