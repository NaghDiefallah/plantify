"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";

import {
  clearStoredTokens,
  fetchHistory,
  fetchProfile,
  fetchStats,
  fetchTips,
  getStoredAccessToken,
  logoutCurrentSession
} from "@/lib/api";
import type { DashboardStats, ScanHistory, UserProfile } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { DetectionCard } from "@/components/dashboard/detection-card";
import { HistoryTable } from "@/components/dashboard/history-table";
import { UserNav } from "@/components/dashboard/user-nav";

export function BentoGrid() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<ScanHistory[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ total_scans: 0, healthy_ratio: 0, top_disease: null });
  const [tips, setTips] = useState<string[]>([]);

  const refresh = useCallback(async (jwt: string) => {
    const [profile, historyRows, statsResponse, tipsResponse] = await Promise.all([
      fetchProfile(jwt),
      fetchHistory(jwt),
      fetchStats(jwt),
      fetchTips(jwt)
    ]);

    setUser(profile);
    setHistory(historyRows);
    setStats(statsResponse);
    setTips(tipsResponse);
  }, []);

  useEffect(() => {
    const jwt = getStoredAccessToken();
    if (!jwt) {
      return;
    }
    setToken(jwt);
    refresh(jwt).catch(() => {
      clearStoredTokens();
      setToken(null);
      setUser(null);
    });
  }, [refresh]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-12">
        <UserNav
          user={user}
          onLogout={async () => {
            await logoutCurrentSession();
            setToken(null);
            setUser(null);
          }}
        />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="lg:col-span-7">
        <DetectionCard token={token} onDetected={() => (token ? refresh(token) : Promise.resolve())} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="lg:col-span-5">
        <Card className="h-full">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Statistics</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-black/30 p-4">
              <p className="text-xs text-muted-foreground">Total scanned</p>
              <p className="mt-1 text-2xl font-semibold">{stats.total_scans}</p>
            </div>
            <div className="rounded-xl bg-black/30 p-4">
              <p className="text-xs text-muted-foreground">Health ratio</p>
              <p className="mt-1 text-2xl font-semibold">{(stats.healthy_ratio * 100).toFixed(1)}%</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Most common finding: {stats.top_disease ?? "N/A"}</p>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="lg:col-span-8">
        <HistoryTable rows={history} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-4">
        <Card className="h-full">
          <h3 className="text-base font-semibold">Plant Health Tips</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {tips.map((tip) => (
              <li key={tip} className="rounded-xl border border-border/60 bg-black/20 p-3">
                {tip}
              </li>
            ))}
            {tips.length === 0 ? <li>Sign in to load tips.</li> : null}
          </ul>
        </Card>
      </motion.div>
    </div>
  );
}
