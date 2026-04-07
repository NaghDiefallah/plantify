"use client";

import {ImageIcon, Search, AlertCircle, CheckCircle2, Info, X} from "lucide-react";
import {useEffect, useMemo, useState} from "react";
import Image from "next/image";
import {useTranslations} from "next-intl";
import {useQuery} from "@tanstack/react-query";

import {fetchHistory, getStoredAccessToken} from "@/lib/api";
import type {ScanHistory} from "@/lib/types";
import {cn} from "@/lib/utils";

type NoticeKind = "error" | "success" | "info";

type Notice = {
  id: number;
  kind: NoticeKind;
  message: string;
};

function HistoryImage({row}: {row: ScanHistory}) {
  const imageSrc = row.before_image_b64 ? `data:image/jpeg;base64,${row.before_image_b64}` : null;

  if (imageSrc) {
    return (
      <Image
        src={imageSrc}
        alt="Scan thumbnail"
        width={160}
        height={96}
        unoptimized
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-[var(--bg-secondary)] text-[var(--text-tertiary)]">
      <ImageIcon className="h-4 w-4" />
    </div>
  );
}

export function ScanHistoryContent() {
  const t = useTranslations("dashboard");
  const [token, setToken] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    setToken(getStoredAccessToken());
  }, []);

  const pushNotice = (kind: NoticeKind, message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 10000);
    setNotices((prev) => [...prev, {id, kind, message}]);
    window.setTimeout(() => {
      setNotices((prev) => prev.filter((notice) => notice.id !== id));
    }, 4500);
  };

  const historyQuery = useQuery({
    queryKey: ["history"],
    queryFn: () => fetchHistory(token ?? ""),
    enabled: Boolean(token)
  });

  useEffect(() => {
    if (historyQuery.error) {
      pushNotice("error", historyQuery.error instanceof Error ? historyQuery.error.message : t("errors.scan"));
    }
  }, [historyQuery.error, t]);

  const filteredRows = useMemo(() => {
    const rows: ScanHistory[] = historyQuery.data ?? [];
    const sortedRows = [...rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return sortedRows.filter((row) => {
      const haystack = `${row.plant_name ?? ""} ${row.disease ?? ""} ${row.disease_type} ${row.domain}`.toLowerCase();
      return haystack.includes(query.toLowerCase());
    });
  }, [historyQuery.data, query]);

  return (
    <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 md:p-5">
      {notices.length > 0 ? (
        <div className="fixed right-4 top-4 z-[70] flex w-[min(90vw,24rem)] flex-col gap-2">
          {notices.map((notice) => {
            const tone =
              notice.kind === "error"
                ? "border-red-300/70 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
                : notice.kind === "success"
                  ? "border-emerald-300/70 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
                  : "border-sky-300/70 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200";

            const Icon = notice.kind === "error" ? AlertCircle : notice.kind === "success" ? CheckCircle2 : Info;

            return (
              <div key={notice.id} className={cn("rounded-xl border px-3 py-2 shadow-lg backdrop-blur", tone)}>
                <div className="flex items-start gap-2">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="text-sm leading-5">{notice.message}</p>
                  <button
                    type="button"
                    onClick={() => setNotices((prev) => prev.filter((n) => n.id !== notice.id))}
                    className="ml-auto rounded p-1 opacity-70 transition hover:opacity-100"
                    aria-label="Dismiss notification"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">{t("history.title")}</h3>
        <label className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("history.searchPlaceholder")}
            className="h-10 w-full rounded-lg border border-[var(--card-border)] bg-[var(--bg-primary)] pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none focus:border-[#22c55e]"
          />
        </label>
      </div>

      <div className="space-y-3">
        {historyQuery.isLoading ? (
          <p className="text-sm text-[var(--text-secondary)]">{t("history.loading")}</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">{t("history.empty")}</p>
        ) : (
          filteredRows.map((row) => (
            <div key={row.id} className="grid gap-3 rounded-2xl border border-[var(--card-border)] p-3 md:grid-cols-[112px_1fr_auto] md:items-center">
              <div className="h-24 overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--bg-secondary)]">
                <HistoryImage row={row} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{row.plant_name || row.disease_type}</p>
                  <span className="rounded-full bg-[var(--bg-secondary)] px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                    {row.domain}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      (row.disease || row.disease_type).toLowerCase().includes("healthy")
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    )}
                  >
                    {row.disease || row.disease_type}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">{new Date(row.created_at).toLocaleString()}</p>
                <p className="mt-2 line-clamp-2 text-sm text-[var(--text-secondary)]">{row.recommendation}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">{t("result.metrics.modelConfidence")}</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{(row.confidence_score * 100).toFixed(1)}%</p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
