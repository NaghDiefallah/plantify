import {type InputHTMLAttributes, useId} from "react";

import {Input} from "@/components/ui/input";
import {cn} from "@/lib/utils";

interface FloatingFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function FloatingField({label, className, ...props}: FloatingFieldProps) {
  const id = useId();

  return (
    <div className="group relative">
      <Input id={id} placeholder=" " className={cn("peer h-12 border-white/10 bg-[#060607] pt-5", className)} {...props} />
      <label
        htmlFor={id}
        className="pointer-events-none absolute start-3 top-2.5 text-xs text-zinc-500 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-2.5 peer-focus:text-xs peer-focus:text-[#C8E43B]"
      >
        {label}
      </label>
    </div>
  );
}
