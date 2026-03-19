"use client";

import {motion} from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  TrendingUp,
  UploadCloud,
  Zap
} from "lucide-react";
import {useMemo, useState} from "react";
import {useDropzone} from "react-dropzone";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";

import {BentoTile} from "@/components/ui/bento-tile";
import {Button} from "@/components/ui/button";
import {CircularGauge} from "@/components/ui/circular-gauge";
import {ComparisonSlider} from "@/components/ui/comparison-slider";
import {Sparkline} from "@/components/ui/sparkline";
import {
  FeedTileSkeleton,
  MetricTileSkeleton,
  ResultTileSkeleton,
  UploadTileSkeleton
} from "@/components/ui/tile-skeleton";
import {cn} from "@/lib/utils";
import {compressImage} from "@/hooks/use-image-compression";
import {
  detectPlant,
  fetchHistory,
  fetchStats,
  fetchTips,
  getStoredAccessToken
} from "@/lib/api";
import type {DetectionResult, ScanHistory} from "@/lib/types";

function createPreview(file: File | null): string | null {
  return file ? URL.createObjectURL(file) : null;
}

// ─── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({status}: {status: string}) {
  const busy = status !== "Idle" && status !== "Completed" && status !== "Failed";
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest transition-all duration-300",
        busy
          ? "border-lumaris-lime/40 bg-lumaris-lime/10 text-lumaris-lime"
          : status === "Completed"
          ? "border-lumaris-green/40 bg-lumaris-green/10 text-lumaris-green"
          : status === "Failed"
          ? "border-red-500/40 bg-red-500/10 text-red-400"
          : "border-lumaris-border bg-lumaris-surface text-zinc-500"
      )}
    >
      {busy && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lumaris-lime" />}
      {status}
    </span>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export function FarmerDashboard() {
  const queryClient = useQueryClient();
  const token = getStoredAccessToken();

  const [original, setOriginal] = useState<File | null>(null);
  const [compressionStatus, setCompressionStatus] = useState("Idle");
  const [result, setResult] = useState<DetectionResult | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const statsQuery = useQuery({
    queryKey: ["stats"],
    queryFn: () => fetchStats(token ?? ""),
    enabled: Boolean(token)
  });

  const historyQuery = useQuery({
    queryKey: ["history"],
    queryFn: () => fetchHistory(token ?? ""),
    enabled: Boolean(token)
  });

  const tipsQuery = useQuery({
    queryKey: ["tips"],
    queryFn: () => fetchTips(token ?? ""),
    enabled: Boolean(token)
  });

  // ── Mutation ───────────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: async () => {
      if (!original || !token) throw new Error("Upload an image and sign in first.");
      setCompressionStatus("Compressing...");
      const compressedOriginal = await compressImage(original);
      setCompressionStatus("Analyzing models...");

      const automaticDomains: Array<"color" | "grayscale" | "segmented"> = ["color", "grayscale", "segmented"];
      const responses = await Promise.all(
        automaticDomains.map((domain) =>
          detectPlant({
            token,
            image: compressedOriginal,
            domain
          })
        )
      );

      return responses.reduce((best, current) =>
        current.confidence_score > best.confidence_score ? current : best
      );
    },
    onSuccess: (payload) => {
      setResult(payload);
      setCompressionStatus("Completed");
      void queryClient.invalidateQueries({queryKey: ["history"]});
      void queryClient.invalidateQueries({queryKey: ["stats"]});
      void queryClient.invalidateQueries({queryKey: ["tips"]});
    },
    onError: () => setCompressionStatus("Failed")
  });

  // ── Dropzones ──────────────────────────────────────────────────────────────
  const imgAccept = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/webp": [".webp"]
  };
  const originalZone = useDropzone({
    multiple: false,
    accept: imgAccept,
    onDrop: (accepted) => setOriginal(accepted[0] ?? null)
  });

  // ── Derived state ──────────────────────────────────────────────────────────
  const previewUrl = useMemo(() => createPreview(original), [original]);

  const beforeSrc = useMemo(() => {
    if (result?.before_image_b64) return `data:image/jpeg;base64,${result.before_image_b64}`;
    return (
      previewUrl ??
      "https://images.unsplash.com/photo-1592841200221-3f3f82bcefcf?q=80&w=1200"
    );
  }, [result?.before_image_b64, previewUrl]);

  const afterSrc = useMemo(() => {
    if (result?.after_image_b64) return `data:image/jpeg;base64,${result.after_image_b64}`;
    return beforeSrc;
  }, [result?.after_image_b64, beforeSrc]);

  const historyRows: ScanHistory[] = historyQuery.data ?? [];
  const healthRatioPct = ((statsQuery.data?.healthy_ratio ?? 0) * 100).toFixed(1);
  const confidencePct = (result?.confidence_score ?? 0) * 100;
  const isHealthy = result?.disease_type?.toLowerCase().includes("healthy") ?? false;

  const defaultTips = [
    "Irrigate between 6–8 am to minimize evaporation loss",
    "Inspect leaf undersides for mites and aphids weekly",
    "Apply recommended fungicide at 14-day intervals",
    "Remove infected leaves immediately to curb spread"
  ];
  const tips: string[] = tipsQuery.data ?? defaultTips;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <section className="farmer-bento mx-auto max-w-[1400px] px-4 py-6">
      {/* ═══════════════════════════════════════════════════════ SCAN TILE */}
      <div className="area-scan">
        {mutation.isPending && !original ? (
          <UploadTileSkeleton />
        ) : (
          <BentoTile className="flex min-h-[600px] flex-col gap-4" layoutId="farmer-upload">
            {/* -- header ---------------------------------------------------- */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full transition-colors",
                    mutation.isPending ? "animate-pulse bg-lumaris-lime" : "bg-lumaris-green"
                  )}
                />
                <h2 className="text-sm font-semibold tracking-tight text-white">New Scan</h2>
              </div>
              <StatusBadge status={compressionStatus} />
            </div>

            {/* -- primary drop zone ----------------------------------------- */}
            <div
              {...originalZone.getRootProps()}
              className={cn(
                "relative flex flex-1 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed transition-all duration-300",
                originalZone.isDragActive
                  ? "border-lumaris-lime/70 bg-lumaris-lime/5 shadow-[0_0_28px_rgba(200,228,59,0.2)]"
                  : original
                  ? "border-lumaris-border bg-transparent"
                  : "border-lumaris-muted bg-lumaris-surface/40 hover:border-zinc-500 hover:bg-lumaris-surface/70"
              )}
              style={{minHeight: "15rem"}}
            >
              <input {...originalZone.getInputProps()} />

              {original && previewUrl ? (
                <>
                  <img
                    src={previewUrl}
                    alt="Leaf preview"
                    className="h-full w-full object-cover"
                  />
                  {mutation.isPending && (
                    <div className="absolute inset-0 bg-black/30">
                      <div className="laser-line absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-lumaris-lime to-transparent opacity-90" />
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3">
                    <span className="rounded-lg bg-black/70 px-2 py-1 text-[11px] font-medium text-zinc-300 backdrop-blur-sm">
                      {original.name}
                    </span>
                  </div>
                </>
              ) : (
                <div className="pointer-events-none flex flex-col items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-lumaris-muted bg-lumaris-tile shadow-tile">
                    <UploadCloud className="h-6 w-6 text-zinc-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-zinc-200">Drop your leaf scan here</p>
                    <p className="mt-0.5 text-xs text-zinc-600">JPG · PNG · WebP — max 10 MB</p>
                  </div>
                  <span className="rounded-full border border-lumaris-border bg-lumaris-tile px-3 py-1 text-xs text-zinc-400">
                    or click to browse
                  </span>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-lumaris-muted/60 bg-lumaris-surface/30 px-3 py-2 text-xs text-zinc-500">
              Automatic mode is enabled: Plantify selects the best analysis pipeline for your image.
            </div>

            {/* -- run button ------------------------------------------------ */}
            <Button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !original}
              className={cn(
                "w-full gap-2 rounded-xl text-sm font-semibold transition-all duration-200",
                !mutation.isPending
                  ? "bg-lumaris-lime text-lumaris-dark hover:bg-[#d4ee42] hover:shadow-lime"
                  : "bg-lumaris-lime/40 text-lumaris-dark/60"
              )}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Run Diagnosis
                </>
              )}
            </Button>
          </BentoTile>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════ RESULT TILE */}
      <div className="area-result">
        {mutation.isPending && !result ? (
          <ResultTileSkeleton />
        ) : (
          <BentoTile className="flex min-h-[600px] flex-col gap-4">
            {/* -- header ---------------------------------------------------- */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-tight text-white">
                Analysis Result
              </h2>
              {result && (
                <motion.span
                  initial={{opacity: 0, scale: 0.85}}
                  animate={{opacity: 1, scale: 1}}
                  className={cn(
                    "rounded-full border px-3 py-0.5 text-[11px] font-semibold",
                    isHealthy
                      ? "border-lumaris-green/30 bg-lumaris-green/10 text-lumaris-green"
                      : "border-red-500/30 bg-red-500/10 text-red-400"
                  )}
                >
                  {isHealthy ? "✓ Healthy" : "⚠ Diseased"}
                </motion.span>
              )}
            </div>

            {/* -- comparison slider ----------------------------------------- */}
            <ComparisonSlider
              beforeSrc={beforeSrc}
              afterSrc={afterSrc}
              beforeLabel="Source"
              afterLabel="AI Output"
              className="flex-1"
            />

            {/* -- confidence + disease card ---------------------------------- */}
            <div className="flex items-center gap-4 rounded-2xl border border-lumaris-border bg-lumaris-tile p-4 shadow-tile">
              <CircularGauge value={confidencePct} label="confidence" />
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                    Detected Condition
                  </p>
                  <p className="mt-0.5 text-base font-semibold leading-snug text-white">
                    {result?.disease_type ?? "—"}
                  </p>
                </div>
                <p className="line-clamp-3 text-sm leading-relaxed text-zinc-400">
                  {result?.treatment_recommendations ??
                    "Upload a leaf image and run the diagnosis to receive an AI-generated treatment roadmap."}
                </p>
              </div>
            </div>
          </BentoTile>
        )}
      </div>

      {/* ══════════════════════════════════════════════════ HEALTH TILE */}
      <div className="area-health">
        {statsQuery.isLoading ? (
          <MetricTileSkeleton />
        ) : (
          <BentoTile className="flex h-full flex-col justify-between gap-4">
            {/* KPI number */}
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
                Health Ratio
              </p>
              <motion.p
                key={healthRatioPct}
                initial={{opacity: 0, y: 6}}
                animate={{opacity: 1, y: 0}}
                className="mt-1.5 font-mono text-4xl font-semibold text-white"
              >
                {healthRatioPct}%
              </motion.p>
              <p className="mt-0.5 text-[11px] text-zinc-600">across all recorded scans</p>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-lumaris-green">Healthy</span>
                <span className="text-red-400">Diseased</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-lumaris-muted/30">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-lumaris-green to-lumaris-lime"
                  initial={{width: "0%"}}
                  animate={{width: `${healthRatioPct}%`}}
                  transition={{duration: 0.9, ease: "easeOut"}}
                />
              </div>
            </div>

            {/* Secondary metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-lumaris-border bg-lumaris-tile p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                  Top Disease
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-lumaris-lime">
                  <TrendingUp className="h-3 w-3" />
                  <span className="truncate">
                    {statsQuery.data?.top_disease ?? "—"}
                  </span>
                </p>
              </div>
              <div className="rounded-xl border border-lumaris-border bg-lumaris-tile p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                  Total Scans
                </p>
                <p className="mt-1 font-mono text-lg font-semibold text-white">
                  {statsQuery.data?.total_scans ?? historyRows.length}
                </p>
              </div>
            </div>
          </BentoTile>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════ TIPS TILE */}
      <div className="area-tips">
        {tipsQuery.isLoading ? (
          <MetricTileSkeleton />
        ) : (
          <BentoTile className="flex h-full flex-col gap-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
              Treatment Protocol
            </p>
            <ul className="flex flex-col gap-3">
              {tips.slice(0, 4).map((tip, i) => (
                <motion.li
                  key={tip}
                  initial={{opacity: 0, x: -8}}
                  animate={{opacity: 1, x: 0}}
                  transition={{delay: i * 0.07}}
                  className="flex items-start gap-2.5"
                >
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lumaris-green/15 ring-1 ring-lumaris-green/20">
                    <CheckCircle2 className="h-3 w-3 text-lumaris-green" />
                  </div>
                  <p className="text-sm leading-snug text-zinc-300">{tip}</p>
                </motion.li>
              ))}
            </ul>
          </BentoTile>
        )}
      </div>

      {/* ════════════════════════════════════════════════════ FEED TILE */}
      <div className="area-feed">
        {historyQuery.isLoading ? (
          <FeedTileSkeleton />
        ) : (
          <BentoTile className="flex flex-col gap-3 overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
                Recent Analyses
              </p>
              <span className="font-mono text-xs text-zinc-500">
                {historyRows.length} entries
              </span>
            </div>

            {/* Scrollable feed list */}
            <div className="max-h-52 divide-y divide-lumaris-border/40 overflow-y-auto">
              {historyRows.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-zinc-600">
                  <AlertTriangle className="h-8 w-8 opacity-30" />
                  <p className="text-sm">No scans recorded yet.</p>
                </div>
              ) : (
                historyRows.map((row, idx) => {
                  const isDangerous =
                    row.confidence_score > 0.7 &&
                    !row.disease_type.toLowerCase().includes("healthy");
                  /** Rolling window of up to 5 prior confidence scores for sparkline */
                  const windowData = historyRows
                    .slice(Math.max(0, idx - 4), idx + 1)
                    .map((r) => r.confidence_score);

                  return (
                    <motion.div
                      key={row.id}
                      initial={{opacity: 0}}
                      animate={{opacity: 1}}
                      transition={{delay: Math.min(idx * 0.04, 0.4)}}
                      className="flex items-center gap-3 py-3"
                    >
                      {/* Status dot */}
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          isDangerous ? "bg-red-400" : "bg-lumaris-green"
                        )}
                      />

                      {/* Disease + confidence */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          {row.disease_type}
                        </p>
                        <p className="font-mono text-[11px] text-zinc-500">
                          {(row.confidence_score * 100).toFixed(1)}% confidence
                        </p>
                      </div>

                      {/* Confidence sparkline */}
                      <Sparkline
                        data={windowData}
                        color={isDangerous ? "#f87171" : "#C8E43B"}
                        areaColor={isDangerous ? "#f87171" : "#C8E43B"}
                      />

                      {/* Status badge */}
                      <span
                        className={cn(
                          "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          isDangerous
                            ? "border-red-500/30 bg-red-500/10 text-red-400"
                            : "border-lumaris-green/30 bg-lumaris-green/10 text-lumaris-green"
                        )}
                      >
                        {isDangerous ? "Alert" : "Stable"}
                      </span>
                    </motion.div>
                  );
                })
              )}
            </div>
          </BentoTile>
        )}
      </div>
    </section>
  );
}
