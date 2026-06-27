import {forwardRef, type InputHTMLAttributes} from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({className, ...props}, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-lg border border-card-border bg-card-bg px-4 py-2.5 text-text-primary placeholder:text-text-tertiary",
          "focus:border-[var(--ring)]/50 focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]/30",
          "disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
          className
        )}
        {...props}
      />
    );
  }
);
