import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "error";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: cn(
    "border-border bg-muted text-foreground",
  ),
  success: cn(
    "border-emerald-300 bg-emerald-50 text-emerald-800",
    "dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
  ),
  warning: cn(
    "border-amber-300 bg-amber-50 text-amber-800",
    "dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
  ),
  error: cn(
    "border-red-300 bg-red-50 text-red-800",
    "dark:border-red-700 dark:bg-red-950/30 dark:text-red-300"
  ),
};

export function Badge({ variant = "default", children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant]
      )}
    >
      {children}
    </span>
  );
}
