"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Rocket,
  BookOpen,
  Code,
  Lightbulb,
  Layers,
  Compass,
  GraduationCap,
  Wrench,
  Search,
  Languages,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchDialog } from "@/components/search/search-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { type NavGroup, flattenNavigation } from "@/lib/nav-types";
import type { LocaleEntry } from "@/lib/config";

/* ------------------------------------------------------------------ */
/*  Card icon / color palette (cycles by index)                        */
/* ------------------------------------------------------------------ */

const cardStyles: { icon: LucideIcon; bg: string; fg: string }[] = [
  { icon: Rocket,        bg: "bg-violet-100 dark:bg-violet-500/15",   fg: "text-violet-600 dark:text-violet-400" },
  { icon: BookOpen,      bg: "bg-sky-100 dark:bg-sky-500/15",         fg: "text-sky-600 dark:text-sky-400" },
  { icon: Code,          bg: "bg-emerald-100 dark:bg-emerald-500/15", fg: "text-emerald-600 dark:text-emerald-400" },
  { icon: Lightbulb,     bg: "bg-amber-100 dark:bg-amber-500/15",     fg: "text-amber-600 dark:text-amber-400" },
  { icon: Layers,        bg: "bg-rose-100 dark:bg-rose-500/15",       fg: "text-rose-600 dark:text-rose-400" },
  { icon: Compass,       bg: "bg-cyan-100 dark:bg-cyan-500/15",       fg: "text-cyan-600 dark:text-cyan-400" },
  { icon: GraduationCap, bg: "bg-indigo-100 dark:bg-indigo-500/15",   fg: "text-indigo-600 dark:text-indigo-400" },
  { icon: Wrench,        bg: "bg-orange-100 dark:bg-orange-500/15",   fg: "text-orange-600 dark:text-orange-400" },
];

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface HomeContentProps {
  title: string;
  description: string;
  defaultLocale: string;
  locales: LocaleEntry[];
  allNavigations: Record<string, NavGroup[]>;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function HomeContent({
  title,
  description,
  defaultLocale,
  locales,
  allNavigations,
}: HomeContentProps) {
  const [locale, setLocale] = useState(defaultLocale);
  const [searchOpen, setSearchOpen] = useState(false);

  const navigation = allNavigations[locale] ?? [];
  const firstDocPath = flattenNavigation(navigation)[0]?.path ?? "";

  /* ---------- Cmd/Ctrl+K shortcut ---------- */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const isEditable =
        tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        if (isEditable) return;
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <div className="flex min-h-screen flex-col items-center bg-background px-4">
        {/* Top bar: theme + language */}
        <div className="flex w-full max-w-4xl items-center justify-end gap-1 pt-4">
          {locales.length > 1 && (
            <div className="relative">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                onClick={() => {
                  // Cycle through locales
                  const idx = locales.findIndex((l) => l.code === locale);
                  const next = locales[(idx + 1) % locales.length];
                  setLocale(next.code);
                }}
                aria-label="Switch language"
              >
                <Languages className="size-4" />
                <span className="text-xs font-medium">
                  {locales.find((l) => l.code === locale)?.label}
                </span>
              </button>
            </div>
          )}
          <ThemeToggle />
        </div>

        {/* Hero */}
        <main className="flex flex-col items-center gap-8 pt-16 pb-12 text-center sm:pt-24">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            {title}
          </h1>

          <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
            {description}
          </p>

          {/* Search bar */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex w-full max-w-md items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Search className="size-4 shrink-0" />
            <span className="flex-1 text-left">搜索文档...</span>
            <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border bg-background px-1.5 text-[11px] font-medium text-muted-foreground">
              &#8984;K
            </kbd>
          </button>

          {firstDocPath && (
            <Link
              href={`/docs/${locale}/${firstDocPath}`}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              开始阅读
              <ArrowRight className="size-4" />
            </Link>
          )}
        </main>

        {/* Navigation group cards */}
        {navigation.length > 0 && (
          <section className="mx-auto w-full max-w-4xl pb-24">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {navigation.map((group, i) => {
                const flat = flattenNavigation([group]);
                const firstPage = flat[0];
                if (!firstPage) return null;
                const style = cardStyles[i % cardStyles.length];
                const Icon = style.icon;
                return (
                  <Link
                    key={group.group}
                    href={`/docs/${locale}/${firstPage.path}`}
                    className="group flex flex-col rounded-xl border border-border bg-background p-6 transition-all hover:border-primary/40 hover:shadow-md"
                  >
                    <div
                      className={cn(
                        "mb-4 inline-flex size-10 items-center justify-center rounded-lg",
                        style.bg,
                      )}
                    >
                      <Icon className={cn("size-5", style.fg)} />
                    </div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {group.group}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {flat.length} 篇文档
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      浏览
                      <ArrowRight className="size-3" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
