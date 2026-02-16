"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { ChevronRight, Search, X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { type NavGroup, type NavItem, isNavItem, flattenNavigation } from "@/lib/nav-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check if a group (recursively) contains a given slug */
function containsSlug(group: NavGroup, slug: string): boolean {
  for (const item of group.pages) {
    if (isNavItem(item)) {
      if (item.path === slug) return true;
    } else {
      if (containsSlug(item, slug)) return true;
    }
  }
  return false;
}

/** Recursively filter navigation by query string */
function filterNavigation(groups: NavGroup[], q: string): NavGroup[] {
  return groups
    .map((group): NavGroup | null => {
      // If group name matches, return entire group
      if (group.group.toLowerCase().includes(q)) return group;
      // Otherwise filter pages recursively
      const filtered: (NavItem | NavGroup)[] = [];
      for (const item of group.pages) {
        if (isNavItem(item)) {
          if (item.title.toLowerCase().includes(q)) filtered.push(item);
        } else {
          const sub = filterNavigation([item], q);
          if (sub.length > 0) filtered.push(sub[0]);
        }
      }
      return filtered.length > 0 ? { ...group, pages: filtered } : null;
    })
    .filter(Boolean) as NavGroup[];
}

/** Collect all group names that contain a given slug (for auto-expanding the path) */
function groupsContainingSlug(groups: NavGroup[], slug: string): string[] {
  const result: string[] = [];
  for (const group of groups) {
    if (containsSlug(group, slug)) {
      result.push(group.group);
      // Also expand nested sub-groups along the path
      for (const item of group.pages) {
        if (!isNavItem(item)) {
          result.push(...groupsContainingSlug([item], slug));
        }
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

interface SidebarProps {
  navigation: NavGroup[];
  currentSlug: string;
  locale: string;
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  navigation,
  currentSlug,
  locale,
  open = false,
  onClose,
}: SidebarProps) {
  // Track which groups are expanded (by group name)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    // Default: expand groups along the path to the current page
    for (const name of groupsContainingSlug(navigation, currentSlug)) {
      initial.add(name);
    }
    // If nothing matched, expand the first group
    if (initial.size === 0 && navigation.length > 0) {
      initial.add(navigation[0].group);
    }
    return initial;
  });

  // Filter search
  const [filterQuery, setFilterQuery] = useState("");

  const filteredNavigation = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return navigation;
    return filterNavigation(navigation, q);
  }, [navigation, filterQuery]);

  const toggleGroup = useCallback((group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  }, []);

  // Close mobile sidebar and expand the group containing the current page
  useEffect(() => {
    onClose?.();
    const names = groupsContainingSlug(navigation, currentSlug);
    if (names.length > 0) {
      setExpandedGroups((prev) => {
        const next = new Set(prev);
        let changed = false;
        for (const name of names) {
          if (!next.has(name)) {
            next.add(name);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlug]);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed top-16 z-40 h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-border bg-background overflow-y-auto",
          "lg:sticky lg:block",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "transition-transform duration-200 ease-in-out",
        )}
      >
        <nav className="px-3 py-4" aria-label="Documentation navigation">
          {/* Filter input */}
          <div className="relative mb-3 px-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="筛选页面..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full rounded-md border border-border bg-muted/50 py-1.5 pl-8 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="清除筛选"
              >
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>

          {/* Empty state */}
          {filteredNavigation.length === 0 && filterQuery && (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
              未找到匹配的页面
            </p>
          )}

          {filteredNavigation.map((group) => (
            <NavGroupSection
              key={group.group}
              group={group}
              depth={0}
              locale={locale}
              currentSlug={currentSlug}
              filterQuery={filterQuery}
              expandedGroups={expandedGroups}
              onToggle={toggleGroup}
            />
          ))}
        </nav>
      </aside>
    </>
  );
}

// ---------------------------------------------------------------------------
// Recursive NavGroup renderer
// ---------------------------------------------------------------------------

function NavGroupSection({
  group,
  depth,
  locale,
  currentSlug,
  filterQuery,
  expandedGroups,
  onToggle,
}: {
  group: NavGroup;
  depth: number;
  locale: string;
  currentSlug: string;
  filterQuery: string;
  expandedGroups: Set<string>;
  onToggle: (group: string) => void;
}) {
  const isExpanded = filterQuery ? true : expandedGroups.has(group.group);
  const isTopLevel = depth === 0;

  return (
    <div className={cn(isTopLevel ? "mb-4" : "mt-1")}>
      {/* Group header */}
      <button
        type="button"
        className={cn(
          "flex w-full items-center justify-between rounded-md px-2 py-1.5 transition-colors hover:text-foreground",
          isTopLevel
            ? "text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            : "text-sm font-medium text-muted-foreground",
        )}
        style={depth > 0 ? { paddingLeft: `${depth * 0.75 + 0.5}rem` } : undefined}
        onClick={() => onToggle(group.group)}
        aria-expanded={isExpanded}
      >
        <span>{group.group}</span>
        <ChevronRight
          className={cn(
            "size-3.5 transition-transform duration-200",
            isExpanded && "rotate-90",
          )}
        />
      </button>

      {/* Group items */}
      {isExpanded && (
        <ul className={cn(isTopLevel && "mt-1", "space-y-0.5")}>
          {group.pages.map((item) => {
            if (isNavItem(item)) {
              const isActive = item.path === currentSlug;
              return (
                <li key={item.path}>
                  <Link
                    href={`/docs/${locale}/${item.path}`}
                    className={cn(
                      "block rounded-md py-1.5 text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                    style={{ paddingLeft: `${(depth + 1) * 0.75 + 0.5}rem` }}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {item.title}
                  </Link>
                </li>
              );
            }
            // Nested sub-group
            return (
              <li key={item.group}>
                <NavGroupSection
                  group={item}
                  depth={depth + 1}
                  locale={locale}
                  currentSlug={currentSlug}
                  filterQuery={filterQuery}
                  expandedGroups={expandedGroups}
                  onToggle={onToggle}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
