import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
};

export function Button({ className, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center rounded-xl border border-border/80 bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
