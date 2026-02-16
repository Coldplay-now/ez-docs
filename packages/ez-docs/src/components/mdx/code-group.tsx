"use client";

import {
  type ReactNode,
  type ReactElement,
  useState,
  useEffect,
  useCallback,
  useRef,
  Children,
  isValidElement,
} from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { langLabels } from "@/lib/lang-labels";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "ezdoc-codegroup-lang";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CodeBlock {
  language: string;
  label: string;
  element: ReactElement;
}

interface CodeGroupProps {
  children: ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CodeGroup({ children }: CodeGroupProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Extract code blocks from children (they are CodePre instances from the MDX pipeline)
  const blocks: CodeBlock[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const props = child.props as Record<string, unknown>;
    const language =
      (props.language as string) ??
      (props["data-language"] as string) ??
      "";
    const label = language
      ? (langLabels[language] ?? language)
      : `Tab ${blocks.length + 1}`;
    blocks.push({ language, label, element: child as ReactElement });
  });

  // Active tab state
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  // Restore preferred language from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const idx = blocks.findIndex((b) => b.language === saved);
        if (idx >= 0) setActiveIndex(idx);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectTab = useCallback(
    (index: number) => {
      setActiveIndex(index);
      const lang = blocks[index]?.language;
      if (lang) {
        try {
          localStorage.setItem(STORAGE_KEY, lang);
        } catch {
          /* ignore */
        }
      }
    },
    // blocks is derived from children which is stable per render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [blocks.length],
  );

  const handleCopy = useCallback(async () => {
    const panel = panelRef.current;
    if (!panel) return;
    const activePanel = panel.querySelector(
      `[data-codegroup-panel="${activeIndex}"]`,
    );
    const code = activePanel?.querySelector("pre")?.textContent ?? "";
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [activeIndex]);

  // Edge cases
  if (blocks.length === 0) return null;
  if (blocks.length === 1) return <>{blocks[0].element}</>;

  return (
    <div className="my-6 overflow-hidden rounded-lg border border-border bg-muted/30">
      {/* Tab bar */}
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-1">
        <div className="flex" role="tablist">
          {blocks.map((block, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              onClick={() => selectTab(i)}
              className={cn(
                "px-3 py-2 text-xs font-medium transition-colors",
                i === activeIndex
                  ? "text-foreground border-b-2 border-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {block.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Copied" : "Copy code"}
          className="mr-2 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {copied ? (
            <Check className="size-3.5 text-green-500" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </button>
      </div>

      {/* Panels — CSS overrides strip CodePre's wrapper chrome */}
      <div ref={panelRef}>
        {blocks.map((block, i) => (
          <div
            key={i}
            role="tabpanel"
            data-codegroup-panel={i}
            className={cn(
              "codegroup-panel",
              i !== activeIndex && "hidden",
            )}
          >
            {block.element}
          </div>
        ))}
      </div>
    </div>
  );
}
