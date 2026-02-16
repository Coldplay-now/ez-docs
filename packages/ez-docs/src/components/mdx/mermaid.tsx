"use client";

import { useEffect, useRef, useState, useId, useCallback } from "react";

interface MermaidProps {
  chart: string;
}

/**
 * Client-side Mermaid diagram renderer.
 *
 * Renders a Mermaid chart definition string into an SVG diagram.
 * Automatically responds to light/dark theme changes via MutationObserver
 * on `document.documentElement`.
 */
export function Mermaid({ chart }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const instanceId = useId().replace(/:/g, "-");

  const isDark = useCallback(() => {
    return document.documentElement.classList.contains("dark");
  }, []);

  const renderChart = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      const mermaid = (await import("mermaid")).default;

      mermaid.initialize({
        startOnLoad: false,
        theme: isDark() ? "dark" : "default",
        suppressErrorRendering: true,
      });

      const renderIdSuffix = Date.now().toString(36);
      const renderId = `mermaid${instanceId}${renderIdSuffix}`;

      const { svg } = await mermaid.render(renderId, chart.trim());

      if (containerRef.current) {
        containerRef.current.innerHTML = svg;
        setStatus("ready");
        setErrorMessage("");
      }
    } catch (err) {
      console.error("[Mermaid] render failed:", err);
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to render Mermaid diagram"
      );
    }
  }, [chart, isDark, instanceId]);

  useEffect(() => {
    renderChart();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          renderChart();
          break;
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
    };
  }, [renderChart]);

  return (
    <div className="my-6">
      {/* Container div is always mounted so ref is available on first render */}
      <div
        ref={containerRef}
        className={
          status === "ready"
            ? "flex justify-center overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 [&>svg]:mx-auto [&>svg]:block"
            : "hidden"
        }
      />

      {/* Loading state */}
      {status === "loading" && (
        <div className="flex items-center justify-center rounded-lg border border-border bg-muted/40 p-8">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <svg
              className="size-5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span>Loading diagram...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
          <div className="flex items-center gap-2 border-b border-red-200 px-4 py-2.5 dark:border-red-800">
            <svg
              className="size-4 shrink-0 text-red-500 dark:text-red-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium text-red-700 dark:text-red-300">
              Mermaid diagram error
            </span>
          </div>
          {errorMessage && (
            <p className="px-4 pt-3 text-xs text-red-600 dark:text-red-400">
              {errorMessage}
            </p>
          )}
          <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-red-800 dark:text-red-200">
            <code>{chart}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
