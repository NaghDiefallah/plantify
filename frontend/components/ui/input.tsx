import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-border bg-black/30 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary",
        className
      )}
      {...props}
    />
  );
}
