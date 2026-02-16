"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Github, Menu, X, Languages } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SearchDialog } from "@/components/search/search-dialog";
import { cn } from "@/lib/utils";
import type { LocaleEntry } from "@/lib/config";
import { type NavGroup, flattenNavigation } from "@/lib/nav-types";
import type { LocaleSlugsMap } from "./docs-layout-shell";

interface HeaderProps {
  siteTitle: string;
  githubUrl?: string;
  menuOpen?: boolean;
  onMenuToggle?: (open: boolean) => void;
  locale: string;
  locales: LocaleEntry[];
  navigation?: NavGroup[];
  currentSlug?: string;
  localeSlugs?: LocaleSlugsMap;
}

export function Header({ siteTitle, githubUrl, menuOpen = false, onMenuToggle, locale, locales, navigation, currentSlug, localeSlugs }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  // Determine which top-level navigation group is currently active
  const activeGroup = navigation?.find((g) =>
    flattenNavigation([g]).some((p) => p.path === currentSlug),
  )?.group;

  const toggleMenu = useCallback(() => {
    onMenuToggle?.(!menuOpen);
  }, [onMenuToggle, menuOpen]);

  /* ---------- Global Cmd/Ctrl+K shortcut ---------- */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger when user is typing in an input/textarea/contenteditable
      const tag = (e.target as HTMLElement)?.tagName;
      const isEditable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement)?.isContentEditable;

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
      <header className="sticky top-0 z-50 h-16 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-full items-center justify-between px-4 lg:px-6">
          {/* Left: Logo / Title */}
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
              onClick={toggleMenu}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}
            </button>

            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground hover:text-foreground/80 transition-colors"
            >
              {siteTitle}
            </Link>
          </div>

          {/* Center: Navigation tabs (desktop only) */}
          {navigation && navigation.length > 0 && (
            <nav className="hidden lg:flex items-stretch gap-1" aria-label="Content groups">
              {navigation.map((group) => {
                const isActive = group.group === activeGroup;
                const firstPage = flattenNavigation([group])[0];
                if (!firstPage) return null;
                return (
                  <Link
                    key={group.group}
                    href={`/docs/${locale}/${firstPage.path}`}
                    className={cn(
                      "relative flex items-center px-3 text-sm font-medium transition-colors",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {group.group}
                    {isActive && (
                      <span className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-primary" />
                    )}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {githubUrl && (
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="GitHub"
              >
                <Github className="size-5" />
              </a>
            )}

            {locales.length > 1 && (
              <LanguageSwitcher locale={locale} locales={locales} currentSlug={currentSlug} localeSlugs={localeSlugs} />
            )}

            <ThemeToggle />
          </div>
        </div>
      </header>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}

// ---------------------------------------------------------------------------
// LanguageSwitcher
// ---------------------------------------------------------------------------

function LanguageSwitcher({
  locale,
  locales,
  currentSlug,
  localeSlugs,
}: {
  locale: string;
  locales: LocaleEntry[];
  currentSlug?: string;
  localeSlugs?: LocaleSlugsMap;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  function switchLocale(targetLocale: string) {
    const target = localeSlugs?.[targetLocale];
    // If the current slug exists in the target locale, navigate to it directly
    if (target && currentSlug && target.slugs.includes(currentSlug)) {
      router.push(`/docs/${targetLocale}/${currentSlug}`);
    } else {
      // Otherwise fall back to the target locale's first page
      const fallback = target?.firstPage ?? "";
      router.push(`/docs/${targetLocale}/${fallback}`);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        onClick={() => setOpen(!open)}
        aria-label="Switch language"
        aria-expanded={open}
      >
        <Languages className="size-5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 min-w-[8rem] rounded-lg border border-border bg-background py-1 shadow-lg z-50">
          {locales.map((l) => (
            <button
              key={l.code}
              type="button"
              className={cn(
                "flex w-full items-center px-3 py-1.5 text-sm transition-colors",
                l.code === locale
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-foreground hover:bg-muted"
              )}
              onClick={() => {
                switchLocale(l.code);
                setOpen(false);
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
