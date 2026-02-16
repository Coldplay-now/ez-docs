"use client";

import { useState, useCallback, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import type { NavGroup } from "@/lib/nav-types";
import type { LocaleEntry } from "@/lib/config";

export type LocaleSlugsMap = Record<string, { slugs: string[]; firstPage: string }>;

interface DocsLayoutShellProps {
  siteTitle: string;
  githubUrl?: string;
  navigation: NavGroup[];
  locale: string;
  locales: LocaleEntry[];
  localeSlugs?: LocaleSlugsMap;
  children: ReactNode;
}

/**
 * Client-side layout shell for the /docs section.
 * Manages the mobile sidebar open/close state and coordinates
 * between Header (toggle button) and Sidebar (drawer).
 */
export function DocsLayoutShell({
  siteTitle,
  githubUrl,
  navigation,
  locale,
  locales,
  localeSlugs,
  children,
}: DocsLayoutShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Extract the current slug from the pathname
  // pathname is like /docs/zh/getting-started or /docs/en/guide/intro
  const prefix = `/docs/${locale}/`;
  const currentSlug = pathname.startsWith(prefix)
    ? pathname.slice(prefix.length).replace(/\/$/, "")
    : pathname.replace(/^\/docs\/?/, "").replace(/\/$/, "");

  const handleMenuToggle = useCallback((open: boolean) => {
    setSidebarOpen(open);
  }, []);

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Skip to content link for keyboard / screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        跳转到正文
      </a>
      <Header
        siteTitle={siteTitle}
        githubUrl={githubUrl}
        menuOpen={sidebarOpen}
        onMenuToggle={handleMenuToggle}
        locale={locale}
        locales={locales}
        navigation={navigation}
        currentSlug={currentSlug}
        localeSlugs={localeSlugs}
      />
      <div className="flex flex-1">
        <Sidebar
          navigation={navigation}
          currentSlug={currentSlug}
          locale={locale}
          open={sidebarOpen}
          onClose={handleSidebarClose}
        />
        {children}
      </div>
    </div>
  );
}
