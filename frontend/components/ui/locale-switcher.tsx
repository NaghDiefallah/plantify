"use client";

import {Languages} from "lucide-react";
import {useLocale} from "next-intl";
import {usePathname, useRouter} from "next/navigation";

import {Button} from "@/components/ui/button";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const nextLocale = locale === "en" ? "ar" : "en";

  const changeLocale = (nextLocale: "en" | "ar") => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments[0] === "en" || segments[0] === "ar") {
      segments[0] = nextLocale;
    } else {
      segments.unshift(nextLocale);
    }
    router.push(`/${segments.join("/")}`);
  };

  return (
    <Button
      type="button"
      onClick={() => changeLocale(nextLocale)}
      className="h-10 w-10 border border-zinc-300 bg-white p-0 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
      aria-label="Switch language"
      title={nextLocale === "ar" ? "Switch to Arabic" : "Switch to English"}
    >
      <Languages className="h-4 w-4" />
    </Button>
  );
}
