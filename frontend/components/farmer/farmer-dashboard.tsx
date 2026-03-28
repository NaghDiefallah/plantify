"use client";

import {motion} from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ImageIcon,
  Loader2,
  Search,
  Sparkles,
  UploadCloud
} from "lucide-react";
import {useMemo, useState} from "react";
import {useTranslations} from "next-intl";
import {useDropzone} from "react-dropzone";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";

import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utils";
import {compressImage} from "@/hooks/use-image-compression";
import {
  detectPlant,
  fetchHistory,
  fetchStats,
  getStoredAccessToken
} from "@/lib/api";
import type {DetectionResult, ScanHistory} from "@/lib/types";

function createPreview(file: File | null): string | null {
  return file ? URL.createObjectURL(file) : null;
}

function parseTreatmentSections(text: string | null | undefined) {
  const fallback = {
    immediate: "",
    next: "",
    monitor: ""
  };

  if (!text) {
    return fallback;
  }

  const sections = {...fallback};
  for (const line of text.split(/\n+/g).map((part) => part.trim()).filter(Boolean)) {
    const [label, ...rest] = line.split(":");
    const body = rest.join(":").trim();
    const normalized = label.toLowerCase();
    if (normalized.startsWith("immediate")) {
      sections.immediate = body;
    } else if (normalized.startsWith("next")) {
      sections.next = body;
    } else if (normalized.startsWith("monitor")) {
      sections.monitor = body;
    }
  }

  return sections;
}

function ConfidenceBar({label, value}: {label: string; value: number}) {
  const tone = value >= 75 ? "bg-[#22c55e]" : value >= 45 ? "bg-[#f59e0b]" : "bg-[#ef4444]";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span>{label}</span>
        <span>{value.toFixed(1)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-300/50 dark:bg-zinc-800">
        <motion.div
          className={cn("h-full rounded-full", tone)}
          initial={{width: 0}}
          animate={{width: `${Math.max(0, Math.min(100, value))}%`}}
          transition={{duration: 0.45, ease: "easeOut"}}
        />
      </div>
    </div>
  );
}

function HistoryImage({row}: {row: ScanHistory}) {
  const imageSrc = row.before_image_b64 ? `data:image/jpeg;base64,${row.before_image_b64}` : null;

  if (imageSrc) {
    return <img src={imageSrc} alt="Scan thumbnail" className="h-full w-full object-cover" />;
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-[var(--bg-secondary)] text-[var(--text-tertiary)]">
      <ImageIcon className="h-4 w-4" />
    </div>
  );
}

export function FarmerDashboard() {
  const t = useTranslations("dashboard");
  const queryClient = useQueryClient();
  const token = getStoredAccessToken();

  const [query, setQuery] = useState("");
  const [original, setOriginal] = useState<File | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);

  const previewUrl = useMemo(() => createPreview(original), [original]);

  const historyQuery = useQuery({
    queryKey: ["history"],
    queryFn: () => fetchHistory(token ?? ""),
    enabled: Boolean(token)
  });

  const statsQuery = useQuery({
    queryKey: ["stats"],
    queryFn: () => fetchStats(token ?? ""),
    enabled: Boolean(token)
  });

  const detectMutation = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error(t("errors.signIn"));
      }
      if (!original) {
        throw new Error(t("errors.upload"));
      }

      const compressed = await compressImage(original);
      return detectPlant({
        token,
        image: compressed,
        domain: "color"
      });
    },
    onSuccess: (payload) => {
      setResult(payload);
      void queryClient.invalidateQueries({queryKey: ["history"]});
      void queryClient.invalidateQueries({queryKey: ["stats"]});
    }
  });

  const zone = useDropzone({
    multiple: false,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"]
    },
    onDrop: (accepted) => setOriginal(accepted[0] ?? null)
  });

  const rows: ScanHistory[] = historyQuery.data ?? [];
  const sortedRows = [...rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const filteredRows = sortedRows.filter((row) => {
    const haystack = `${row.disease_type} ${row.domain}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  const confidence = (result?.confidence_score ?? 0) * 100;
  const treatment = parseTreatmentSections(result?.treatment_recommendations);
  const isHealthy = result?.disease_type.toLowerCase().includes("healthy") ?? false;

  const beforeSrc = result?.before_image_b64
    ? `data:image/jpeg;base64,${result.before_image_b64}`
    : previewUrl;
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
      <section className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">{t("eyebrow")}</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{t("title")}</h2>
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto lg:min-w-[30rem]">
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3">
            <p className="text-xs text-[var(--text-tertiary)]">{t("snapshot.totalScans")}</p>
            <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{statsQuery.data?.total_scans ?? rows.length}</p>
          </div>
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3">
            <p className="text-xs text-[var(--text-tertiary)]">{t("snapshot.healthyRatio")}</p>
            <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{((statsQuery.data?.healthy_ratio ?? 0) * 100).toFixed(1)}%</p>
          </div>
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3">
            <p className="text-xs text-[var(--text-tertiary)]">{t("snapshot.topDisease")}</p>
            <p className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]">{statsQuery.data?.top_disease ?? t("snapshot.noDominantDisease")}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">{t("scanIntake.title")}</h3>
            <span className="text-xs text-[var(--text-tertiary)]">
              {detectMutation.isPending ? t("scanIntake.statusProcessing") : original ? t("scanIntake.statusReady") : t("scanIntake.statusWaiting")}
            </span>
          </div>

          <div
            {...zone.getRootProps()}
            className={cn(
              "relative flex min-h-[22rem] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed p-4 transition",
              zone.isDragActive ? "border-[#22c55e] bg-[#22c55e]/10" : "border-[var(--card-border)] bg-transparent"
            )}
          >
            <input {...zone.getInputProps()} />
            {previewUrl ? (
              <>
                <img src={previewUrl} alt="Leaf preview" className="h-full w-full rounded-xl object-cover" />
                {detectMutation.isPending ? (
                  <div className="absolute inset-0 bg-black/15">
                    <div className="line-sweep absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#22c55e] to-transparent" />
                  </div>
                ) : null}
              </>
            ) : (
              <div className="text-center">
                <UploadCloud className="mx-auto h-8 w-8 text-[var(--text-tertiary)]" />
                <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">{t("scanIntake.dropzoneTitle")}</p>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">JPG, PNG, or WEBP</p>
              </div>
            )}
          </div>

          <Button
            type="button"
            onClick={() => detectMutation.mutate()}
            disabled={detectMutation.isPending || !original}
            className="mt-4 h-11 w-full bg-[#22c55e] text-zinc-50 hover:bg-[#16a34a] active:scale-[0.98]"
          >
            {detectMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("scanIntake.scanning")}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {t("scanIntake.cta")}
              </>
            )}
          </Button>

          {detectMutation.error ? (
            <p className="mt-3 rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/10 px-3 py-2 text-sm text-[#ef4444]">
              {detectMutation.error instanceof Error ? detectMutation.error.message : t("errors.scan")}
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">{t("result.title")}</h3>
            {result ? <span className="text-xs text-[var(--text-tertiary)]">{t("result.domainLabel")} {result.domain}</span> : null}
          </div>

          {result ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)]">
                {beforeSrc ? <img src={beforeSrc} alt="Scan source" className="h-56 w-full object-cover" /> : null}
              </div>

              <div className="rounded-2xl border border-[var(--card-border)] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-semibold text-[var(--text-primary)]">{result.disease_type}</p>
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                    isHealthy ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  )}>
                    {isHealthy ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <AlertTriangle className="mr-1 h-3.5 w-3.5" />}
                    {isHealthy ? t("result.statusHealthy") : t("result.statusAttention")}
                  </span>
                </div>
                <div className="mt-4">
                  <ConfidenceBar label={t("result.metrics.modelConfidence")} value={confidence} />
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-2xl border border-[var(--card-border)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">{t("result.immediate")}</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{treatment.immediate}</p>
                </div>
                <div className="rounded-2xl border border-[var(--card-border)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">{t("result.next")}</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{treatment.next}</p>
                </div>
                <div className="rounded-2xl border border-[var(--card-border)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">{t("result.monitor")}</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{treatment.monitor}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[22rem] flex-col items-center justify-center rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)]/60 p-6 text-center">
              <Clock3 className="h-7 w-7 text-[var(--text-tertiary)]" />
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{t("result.empty")}</p>
            </div>
          )}
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 md:p-5">
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
            filteredRows.slice(0, 12).map((row) => (
              <div key={row.id} className="grid gap-3 rounded-2xl border border-[var(--card-border)] p-3 md:grid-cols-[112px_1fr_auto] md:items-center">
                <div className="h-24 overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--bg-secondary)]">
                  <HistoryImage row={row} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{row.disease_type}</p>
                    <span className="text-xs uppercase tracking-[0.08em] text-[var(--text-tertiary)]">{row.domain}</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-tertiary)]">{new Date(row.created_at).toLocaleString()}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--text-secondary)]">{row.recommendation}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{(row.confidence_score * 100).toFixed(1)}%</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
