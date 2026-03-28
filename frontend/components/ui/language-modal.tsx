"use client";

import {useEffect, useMemo, useState} from "react";
import {createPortal} from "react-dom";
import {Globe, Languages, X} from "lucide-react";
import {useLocale} from "next-intl";

import {usePathname, useRouter} from "@/i18n/navigation";

const LANGUAGE_OPTIONS = [
  {value: "en", label: "English"},
  {value: "zh", label: "中文"},
  {value: "hi", label: "हिन्दी"},
  {value: "es", label: "Español"},
  {value: "ar", label: "العربية"}
] as const;

export function LanguageModalButton({compact = true}: {compact?: boolean}) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    document.body.style.overflow = "hidden";
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const activeLabel = useMemo(
    () => LANGUAGE_OPTIONS.find((option) => option.value === locale)?.label ?? "Language",
    [locale]
  );

  const onSelect = (nextLocale: string) => {
    router.push(pathname, {locale: nextLocale});
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            : "inline-flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        }
        aria-label="Open language selector"
      >
        {compact ? <Languages className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
      </button>

      {mounted && open ? createPortal((
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/45 px-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="language-modal-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-[var(--shadow-lg)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 id="language-modal-title" className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">Select Language</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                aria-label="Close language selector"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              {LANGUAGE_OPTIONS.map((option) => {
                const active = option.value === locale;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onSelect(option.value)}
                    className={
                      active
                        ? "w-full rounded-lg border border-[#22c55e] bg-[#22c55e]/15 px-3 py-2 text-left text-sm font-semibold text-[var(--text-primary)]"
                        : "w-full rounded-lg border border-[var(--card-border)] px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <p className="mt-3 text-xs text-[var(--text-tertiary)]">Current: {activeLabel}</p>
          </div>
        </div>
      ), document.body) : null}
    </>
  );
}
