import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-2xl border border-border/70 bg-card/80 p-5 shadow-[0_1px_30px_rgba(0,0,0,0.15)] backdrop-blur", className)}
      {...props}
    />
  );
}
