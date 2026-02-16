import { type ReactNode } from "react";
import {
  Info,
  AlertTriangle,
  AlertCircle,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CalloutType = "info" | "note" | "warning" | "error" | "tip";

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
}

const calloutConfig: Record<
  "info" | "warning" | "error" | "tip",
  { icon: LucideIcon; className: string }
> = {
  info: { icon: Info, className: "callout-info" },
  warning: { icon: AlertTriangle, className: "callout-warning" },
  error: { icon: AlertCircle, className: "callout-error" },
  tip: { icon: Lightbulb, className: "callout-tip" },
};

export function Callout({ type = "info", title, children }: CalloutProps) {
  const resolvedType = type === "note" ? "info" : type;
  const config = calloutConfig[resolvedType];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "my-6 rounded-lg border-l-4 px-5 py-4",
        config.className,
      )}
      style={{
        borderColor: "var(--callout-border)",
        backgroundColor: "var(--callout-bg)",
        color: "var(--callout-fg)",
      }}
      role="note"
    >
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full"
          style={{
            backgroundColor:
              "color-mix(in oklch, var(--callout-icon) 15%, transparent)",
          }}
        >
          <Icon
            className="size-4 shrink-0"
            style={{ color: "var(--callout-icon)" }}
            aria-hidden="true"
          />
        </div>
        <div className="min-w-0 flex-1">
          {title && (
            <p className="mb-1.5 text-sm font-semibold leading-snug">
              {title}
            </p>
          )}
          <div className="text-sm leading-relaxed [&>p]:mb-2 [&>p:last-child]:mb-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
