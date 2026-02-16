"use client";

import { type ReactNode, useRef, useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { langLabels } from "@/lib/lang-labels";

interface CodePreProps {
  language?: string;
  className?: string;
  children: ReactNode;
  [key: string]: unknown;
}

export function CodePre({ language, className, children, ...props }: CodePreProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const label = language ? (langLabels[language] ?? language) : undefined;

  const handleCopy = useCallback(async () => {
    if (!wrapperRef.current) return;
    const code = wrapperRef.current.querySelector("pre")?.textContent ?? "";
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="group/code my-6 relative overflow-hidden rounded-lg border border-border bg-muted/30"
    >
      {/* Top bar: language tag + copy button */}
        <div className="flex items-center justify-between px-4 py-1.5 border-b border-border bg-muted/50">
          <span className="select-none text-xs font-medium text-muted-foreground">
            {label ?? ""}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? "Copied" : "Copy code"}
            className={cn(
              "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs transition-colors",
              "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {copied ? (
              <Check className="size-3.5 text-green-500" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </button>
        </div>

      {/* Code area — the inner <pre> gets stripped of its own visual styles */}
      <pre
        className={cn(
          "overflow-x-auto p-4 text-sm leading-relaxed",
          // Reset: no margin, no border, no background on the inner pre
          "m-0 border-0 bg-transparent rounded-none",
          className,
        )}
        {...props}
      >
        {children}
      </pre>
    </div>
  );
}
