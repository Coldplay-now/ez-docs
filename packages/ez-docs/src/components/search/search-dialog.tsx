"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Pagefind types (runtime-loaded, not a TS module)                  */
/* ------------------------------------------------------------------ */

interface PagefindResult {
  id: string;
  data: () => Promise<PagefindResultData>;
}

interface PagefindResultData {
  url: string;
  meta: { title: string };
  excerpt: string;
}

interface PagefindSearchResponse {
  results: PagefindResult[];
}

interface Pagefind {
  search: (query: string) => Promise<PagefindSearchResponse>;
  init?: () => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Dynamic loader – works with and without basePath                  */
/* ------------------------------------------------------------------ */

declare global {
  interface Window {
    __pagefind?: Pagefind;
  }
}

async function loadPagefind(): Promise<Pagefind> {
  if (window.__pagefind) return window.__pagefind;

  try {
    // Try root-relative path first (works when basePath is empty)
    // @ts-expect-error dynamic import from public path at runtime
    const pf = await import(/* webpackIgnore: true */ "/pagefind/pagefind.js");
    window.__pagefind = pf as Pagefind;
    return pf as Pagefind;
  } catch {
    // Fallback: read basePath from <meta name="pagefind-base">
    const basePath =
      document
        .querySelector('meta[name="pagefind-base"]')
        ?.getAttribute("content") ?? "";

    const pf = await import(
      /* webpackIgnore: true */ `${basePath}/pagefind/pagefind.js`
    );
    window.__pagefind = pf as Pagefind;
    return pf as Pagefind;
  }
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

/** Maximum number of search results to display */
const MAX_RESULTS = 10;

/** Number of results to load in the first parallel batch for fast display */
const FIRST_BATCH_SIZE = 3;

/** Debounce delay (ms) before triggering a search after typing */
const SEARCH_DEBOUNCE_MS = 200;

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PagefindResultData[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pagefindReady, setPagefindReady] = useState<boolean | null>(null);
  // null = not attempted, true = loaded, false = failed

  /* ---------- initialise pagefind on first open ---------- */
  useEffect(() => {
    if (!open) return;
    if (pagefindReady !== null) return; // already tried

    let cancelled = false;
    loadPagefind()
      .then(() => {
        if (!cancelled) setPagefindReady(true);
      })
      .catch(() => {
        if (!cancelled) setPagefindReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, pagefindReady]);

  /* ---------- focus input when dialog opens ---------- */
  useEffect(() => {
    if (open) {
      // small delay so the dialog renders first
      const id = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
    // reset state when closing
    setQuery("");
    setResults([]);
    setActiveIndex(0);
  }, [open]);

  /* ---------- search when query changes ---------- */
  useEffect(() => {
    if (!open || !query.trim()) {
      setResults([]);
      setActiveIndex(0);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const pagefind = await loadPagefind();
        const search = await pagefind.search(query);
        if (cancelled) return;

        const topResults = search.results.slice(0, MAX_RESULTS);
        if (topResults.length === 0) {
          setResults([]);
          setActiveIndex(0);
          return;
        }

        // Progressive loading: first batch in parallel for fast display,
        // then load remaining one by one to limit concurrent requests.
        const loaded: PagefindResultData[] = [];

        const firstBatch = await Promise.all(
          topResults.slice(0, FIRST_BATCH_SIZE).map((r) => r.data())
        );
        if (cancelled) return;
        loaded.push(...firstBatch);
        setResults([...loaded]);
        setActiveIndex(0);

        for (let i = FIRST_BATCH_SIZE; i < topResults.length; i++) {
          if (cancelled) return;
          const data = await topResults[i].data();
          if (cancelled) return;
          loaded.push(data);
          setResults([...loaded]);
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open]);

  /* ---------- navigate to a result ---------- */
  const navigateTo = useCallback(
    (url: string) => {
      onOpenChange(false);
      // Pagefind URLs include basePath (e.g. /ezdoc/docs/zh/...), but
      // router.push() adds basePath automatically, so strip it first.
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      const cleanUrl = basePath && url.startsWith(basePath)
        ? url.slice(basePath.length) || "/"
        : url;
      router.push(cleanUrl);
    },
    [onOpenChange, router]
  );

  /* ---------- keyboard navigation ---------- */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((i) => (i + 1) % Math.max(results.length, 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex(
            (i) => (i - 1 + results.length) % Math.max(results.length, 1)
          );
          break;
        case "Enter":
          e.preventDefault();
          if (results[activeIndex]) {
            navigateTo(results[activeIndex].url);
          }
          break;
        case "Escape":
          e.preventDefault();
          onOpenChange(false);
          break;
      }
    },
    [results, activeIndex, navigateTo, onOpenChange]
  );

  /* ---------- scroll active item into view ---------- */
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.children[activeIndex] as HTMLElement | undefined;
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  /* ---------- render nothing when closed ---------- */
  if (!open) return null;

  /* ---------- content helpers ---------- */
  const showEmpty = !query.trim() && results.length === 0 && !loading;
  const showNoResults =
    query.trim().length > 0 && results.length === 0 && !loading;
  const showNotReady = pagefindReady === false;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => onOpenChange(false)}
      onKeyDown={handleKeyDown}
    >
      {/* Dialog panel */}
      <div
        className="relative w-full max-w-xl mx-4 overflow-hidden rounded-xl border border-border bg-background shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Search documentation"
      >
        {/* ---- Search input ---- */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="size-5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索文档..."
            className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {loading && (
            <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
          )}
          <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* ---- Results / states ---- */}
        <div
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto overscroll-contain px-2 py-2"
        >
          {showNotReady && (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
              <Search className="size-8 opacity-40" />
              <p>搜索索引未就绪</p>
              <p className="text-xs">
                请先运行 <code className="rounded bg-muted px-1">pnpm build</code> 生成索引
              </p>
            </div>
          )}

          {!showNotReady && showEmpty && (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
              <Search className="size-8 opacity-40" />
              <p>输入关键词搜索文档</p>
            </div>
          )}

          {!showNotReady && showNoResults && (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
              <FileText className="size-8 opacity-40" />
              <p>未找到相关内容</p>
            </div>
          )}

          {results.map((item, index) => (
            <button
              key={item.url}
              type="button"
              className={cn(
                "flex w-full flex-col gap-1 rounded-lg px-3 py-2.5 text-left transition-colors",
                index === activeIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              )}
              onClick={() => navigateTo(item.url)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span className="text-sm font-medium leading-tight">
                {item.meta.title || "Untitled"}
              </span>
              <span
                className="line-clamp-2 text-xs leading-relaxed text-muted-foreground [&_mark]:bg-yellow-200 [&_mark]:text-foreground dark:[&_mark]:bg-yellow-400/30"
                dangerouslySetInnerHTML={{ __html: item.excerpt }}
              />
            </button>
          ))}
        </div>

        {/* ---- Footer hints ---- */}
        <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1 text-[11px] font-medium">
              &uarr;
            </kbd>
            <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1 text-[11px] font-medium">
              &darr;
            </kbd>
            <span className="ml-0.5">导航</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 text-[11px] font-medium">
              Enter
            </kbd>
            <span className="ml-0.5">打开</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 text-[11px] font-medium">
              Esc
            </kbd>
            <span className="ml-0.5">关闭</span>
          </span>
        </div>
      </div>
    </div>
  );
}
