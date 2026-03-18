"use client";

import type { ScanHistory } from "@/lib/types";
import { Card } from "@/components/ui/card";

interface HistoryTableProps {
  rows: ScanHistory[];
}

export function HistoryTable({ rows }: HistoryTableProps) {
  return (
    <Card className="h-full overflow-hidden">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold">Recent History</h3>
        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Last {rows.length} scans</p>
      </div>
      <div className="max-h-72 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="pb-2 font-medium">Disease</th>
              <th className="pb-2 font-medium">Confidence</th>
              <th className="pb-2 font-medium">Domain</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border/40">
                <td className="py-2">{row.disease_type}</td>
                <td className="py-2">{(row.confidence_score * 100).toFixed(1)}%</td>
                <td className="py-2 capitalize">{row.domain}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-8 text-center text-muted-foreground">
                  No scans yet. Upload your first leaf image.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
