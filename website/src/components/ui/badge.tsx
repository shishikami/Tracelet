import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full border border-emerald-300/20 bg-emerald-300/8 px-2.5 py-1 text-xs font-medium text-emerald-200", className)}
      {...props}
    />
  );
}
