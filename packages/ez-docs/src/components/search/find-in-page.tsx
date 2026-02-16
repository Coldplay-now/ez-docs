"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent,
} from "react";
import { ChevronUp, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** Debounce delay (ms) before triggering DOM search after typing */
const SEARCH_DEBOUNCE_MS = 150;

/** Maximum marks to inject – avoids hanging on very common words */
const MAX_MARKS = 500;

/** Attribute stamped on every injected <mark> for cleanup */
const MARK_ATTR = "data-find-mark";

/* ------------------------------------------------------------------ */
/*  DOM helpers                                                        */
/* ------------------------------------------------------------------ */

/** Selectors whose descendants we should skip when walking text nodes */
const SKIP_SELECTOR = "script, style, svg, .katex-html, textarea, input";

/** Remove all injected <mark> elements and normalise the DOM */
function clearAllMarks() {
  const marks = document.querySelectorAll(`mark[${MARK_ATTR}]`);
  for (const mark of marks) {
    const parent = mark.parentNode;
    if (!parent) continue;
    // Replace the <mark> with its text content
    const text = document.createTextNode(mark.textContent ?? "");
    parent.replaceChild(text, mark);
    parent.normalize();
  }
}

/**
 * Walk text nodes inside `root` that match `query` (case-insensitive)
 * and wrap each occurrence in a `<mark>` element.
 *
 * Returns all injected <mark> elements in document order.
 *
 * The wrapping is done in **reverse** document order so that earlier
 * Range offsets remain valid while later nodes are modified.
 */
function performSearch(root: HTMLElement, query: string): HTMLElement[] {
  if (!query) return [];

  const lowerQuery = query.toLowerCase();

  // 1. Collect matching ranges
  type Hit = { node: Text; start: number };
  const hits: Hit[] = [];

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      // Skip nodes inside elements we want to exclude
      if ((node.parentElement as HTMLElement)?.closest?.(SKIP_SELECTOR)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let textNode: Text | null;
  while ((textNode = walker.nextNode() as Text | null)) {
    const text = textNode.textContent ?? "";
    const lower = text.toLowerCase();
    let idx = 0;
    while (idx < lower.length) {
      const found = lower.indexOf(lowerQuery, idx);
      if (found === -1) break;
      hits.push({ node: textNode, start: found });
      idx = found + lowerQuery.length;
      if (hits.length >= MAX_MARKS) break;
    }
    if (hits.length >= MAX_MARKS) break;
  }

  if (hits.length === 0) return [];

  // 2. Wrap in reverse order so offsets stay valid
  const marks: HTMLElement[] = new Array(hits.length);

  for (let i = hits.length - 1; i >= 0; i--) {
    const { node, start } = hits[i];
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, start + lowerQuery.length);

    const mark = document.createElement("mark");
    mark.className = "find-highlight";
    mark.setAttribute(MARK_ATTR, "");
    range.surroundContents(mark);
    marks[i] = mark;
  }

  return marks;
}

/** Expand any ancestor `<details>` elements so the node is visible */
function expandParentDetails(node: HTMLElement) {
  let el: HTMLElement | null = node;
  while (el) {
    if (el.tagName === "DETAILS") {
      (el as HTMLDetailsElement).open = true;
    }
    el = el.parentElement;
  }
}

/** Highlight the active mark and scroll it into view */
function scrollToMatch(marks: HTMLElement[], index: number) {
  // Remove previous active highlight
  for (const m of marks) {
    m.className = "find-highlight";
  }

  const target = marks[index];
  if (!target) return;

  target.className = "find-highlight-active";
  expandParentDetails(target);
  target.scrollIntoView({ behavior: "smooth", block: "center" });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface FindInPageProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FindInPage({ open, onOpenChange }: FindInPageProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const marksRef = useRef<HTMLElement[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [hitLimit, setHitLimit] = useState(false);

  /* ---------- focus input when opened ---------- */
  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
    // Cleanup on close
    setQuery("");
    clearAllMarks();
    marksRef.current = [];
    setMatchCount(0);
    setActiveIndex(-1);
    setHitLimit(false);
  }, [open]);

  /* ---------- debounced DOM search ---------- */
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      clearAllMarks();

      const trimmed = query.trim();
      if (!trimmed) {
        marksRef.current = [];
        setMatchCount(0);
        setActiveIndex(-1);
        setHitLimit(false);
        return;
      }

      const root = document.getElementById("main-content");
      if (!root) return;

      const marks = performSearch(root, trimmed);
      marksRef.current = marks;
      setMatchCount(marks.length);
      setHitLimit(marks.length >= MAX_MARKS);

      if (marks.length > 0) {
        setActiveIndex(0);
        scrollToMatch(marks, 0);
      } else {
        setActiveIndex(-1);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, open]);

  /* ---------- navigation helpers ---------- */
  const goNext = useCallback(() => {
    const marks = marksRef.current;
    if (marks.length === 0) return;
    const next = (activeIndex + 1) % marks.length;
    setActiveIndex(next);
    scrollToMatch(marks, next);
  }, [activeIndex]);

  const goPrev = useCallback(() => {
    const marks = marksRef.current;
    if (marks.length === 0) return;
    const prev = (activeIndex - 1 + marks.length) % marks.length;
    setActiveIndex(prev);
    scrollToMatch(marks, prev);
  }, [activeIndex]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  /* ---------- keyboard ---------- */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) {
          goPrev();
        } else {
          goNext();
        }
      }
    },
    [handleClose, goNext, goPrev],
  );

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed right-4 top-[4.5rem] z-50",
        "flex items-center gap-1.5 rounded-lg border border-border bg-background/95 px-3 py-2 shadow-lg backdrop-blur",
      )}
      onKeyDown={handleKeyDown}
    >
      {/* Search input */}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="页内搜索..."
        className="w-44 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        autoComplete="off"
        spellCheck={false}
      />

      {/* Match count */}
      {query.trim() && (
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {matchCount === 0
            ? "无匹配"
            : hitLimit
              ? `${activeIndex + 1} / ${matchCount}+`
              : `${activeIndex + 1} / ${matchCount}`}
        </span>
      )}

      {/* Separator */}
      <div className="mx-0.5 h-4 w-px bg-border" />

      {/* Prev / Next */}
      <button
        type="button"
        onClick={goPrev}
        disabled={matchCount === 0}
        className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
        aria-label="上一个匹配"
      >
        <ChevronUp className="size-4" />
      </button>
      <button
        type="button"
        onClick={goNext}
        disabled={matchCount === 0}
        className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
        aria-label="下一个匹配"
      >
        <ChevronDown className="size-4" />
      </button>

      {/* Close */}
      <button
        type="button"
        onClick={handleClose}
        className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="关闭搜索"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
