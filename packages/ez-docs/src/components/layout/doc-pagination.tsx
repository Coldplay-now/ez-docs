import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { NavItem } from "@/lib/nav-types";

const i18nLabels: Record<string, { prev: string; next: string }> = {
  zh: { prev: "上一页", next: "下一页" },
  en: { prev: "Previous", next: "Next" },
};

interface DocPaginationProps {
  prev: NavItem | null;
  next: NavItem | null;
  locale: string;
}

export function DocPagination({ prev, next, locale }: DocPaginationProps) {
  if (!prev && !next) return null;

  const labels = i18nLabels[locale] ?? i18nLabels.en;

  return (
    <nav
      className="mt-12 flex items-stretch gap-4 border-t border-border pt-6"
      aria-label="Pagination"
      data-pagefind-ignore
    >
      {/* Previous page */}
      {prev ? (
        <Link
          href={`/docs/${locale}/${prev.path}`}
          className="group flex flex-1 flex-col items-start rounded-lg border border-border p-4 transition-colors hover:border-primary/40 hover:bg-muted/50"
        >
          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
            <ChevronLeft className="size-3.5" />
            {labels.prev}
          </span>
          <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
            {prev.title}
          </span>
        </Link>
      ) : (
        <div className="flex-1" />
      )}

      {/* Next page */}
      {next ? (
        <Link
          href={`/docs/${locale}/${next.path}`}
          className="group flex flex-1 flex-col items-end rounded-lg border border-border p-4 transition-colors hover:border-primary/40 hover:bg-muted/50"
        >
          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
            {labels.next}
            <ChevronRight className="size-3.5" />
          </span>
          <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
            {next.title}
          </span>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
    </nav>
  );
}
