"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { List, Pin, PinOff, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { FindInPage } from "@/components/search/find-in-page";
import type { TocItem } from "@/lib/nav-types";

interface TocProps {
  toc: TocItem[];
}

export function TableOfContents({ toc }: TocProps) {
  const [activeId, setActiveId] = useState<string>("");
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Panel state: "closed" | "open" | "pinned"
  const [state, setState] = useState<"closed" | "open" | "pinned">("closed");

  // Find-in-page state
  const [findOpen, setFindOpen] = useState(false);

  // Restore pinned state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ezdoc-toc-pinned");
      if (saved === "true") setState("pinned");
    } catch {
      // ignore
    }
  }, []);

  /* ---------- Global Cmd/Ctrl+F shortcut → open find-in-page ---------- */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const isEditable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement)?.isContentEditable;
      if (isEditable) return;

      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setFindOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggle = useCallback(() => {
    setState((prev) => {
      if (prev === "closed") return "open";
      // open or pinned → close
      return "closed";
    });
  }, []);

  const togglePin = useCallback(() => {
    setState((prev) => {
      const next = prev === "pinned" ? "open" : "pinned";
      try {
        localStorage.setItem("ezdoc-toc-pinned", String(next === "pinned"));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const close = useCallback(() => {
    if (state !== "pinned") setState("closed");
  }, [state]);

  // IntersectionObserver to track active heading
  useEffect(() => {
    if (toc.length === 0) return;

    observerRef.current?.disconnect();

    const headingElements = toc
      .map((item) => document.getElementById(item.id))
      .filter(Boolean) as HTMLElement[];

    if (headingElements.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      {
        rootMargin: "-80px 0px -70% 0px",
        threshold: 0,
      },
    );

    for (const el of headingElements) {
      observerRef.current.observe(el);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [toc]);

  if (toc.length === 0) return null;

  const isExpanded = state === "open" || state === "pinned";
  const isPinned = state === "pinned";

  return (
    <>
      {/* ─── Toggle button (always visible, fixed to right edge) ─── */}
      <button
        type="button"
        onClick={toggle}
        aria-label={isExpanded ? "隐藏目录" : "显示目录"}
        className={cn(
          "fixed right-4 top-20 z-30 flex items-center justify-center rounded-lg border border-border bg-background/95 p-2 shadow-sm backdrop-blur transition-colors",
          "hover:bg-muted text-muted-foreground hover:text-foreground",
          isExpanded && "text-primary",
        )}
      >
        {isExpanded ? <X className="size-4" /> : <List className="size-4" />}
      </button>

      {/* ─── Overlay for non-pinned open state on mobile ─── */}
      {state === "open" && (
        <div
          className="fixed inset-0 z-30 bg-black/20 xl:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* ─── TOC panel ─── */}
      <aside
        className={cn(
          // Base
          "fixed right-0 top-16 z-30 h-[calc(100vh-4rem)] w-64 shrink-0 border-l border-border bg-background overflow-y-auto",
          // Transition
          "transition-transform duration-200 ease-in-out",
          // Visibility
          isExpanded ? "translate-x-0" : "translate-x-full",
          // Pinned on large screen: take space in flow
          isPinned && "xl:sticky xl:top-16 xl:z-auto xl:translate-x-0 xl:border-l",
        )}
      >
        <div className="px-4 py-6">
          {/* Header with pin toggle */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              目录
            </p>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setFindOpen(true)}
                aria-label="页内搜索"
                title="页内搜索 (⌘F)"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Search className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={togglePin}
                aria-label={isPinned ? "取消固定" : "固定目录"}
                title={isPinned ? "取消固定" : "固定目录"}
                className={cn(
                  "rounded-md p-1 transition-colors",
                  isPinned
                    ? "text-primary hover:bg-primary/10"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {isPinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
              </button>
            </div>
          </div>

          {/* TOC links */}
          <ul className="space-y-0.5 text-sm">
            {toc.map((item) => {
              const isActive = activeId === item.id;
              const indent = item.depth - 2;

              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className={cn(
                      "block py-1 leading-snug transition-colors border-l-2",
                      indent === 0 && "pl-3",
                      indent === 1 && "pl-6",
                      indent >= 2 && "pl-9",
                      isActive
                        ? "border-primary text-primary font-medium"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40",
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      const el = document.getElementById(item.id);
                      if (el) {
                        el.scrollIntoView({ behavior: "smooth" });
                        window.history.replaceState(null, "", `#${item.id}`);
                        setActiveId(item.id);
                      }
                      // Close if not pinned
                      if (!isPinned) setState("closed");
                    }}
                  >
                    {item.text}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      <FindInPage open={findOpen} onOpenChange={setFindOpen} />
    </>
  );
}
