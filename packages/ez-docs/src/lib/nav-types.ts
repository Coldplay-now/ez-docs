// ─── 纯类型与工具函数（客户端安全） ────────────────────────────

export interface NavItem {
  title: string;
  path: string;
}

export interface NavGroup {
  group: string;
  pages: (NavItem | NavGroup)[];
}

export interface TocItem {
  depth: number; // 2-4 (h2-h4)
  text: string;
  id: string;
}

export interface DocMeta {
  title: string;
  description?: string;
  icon?: string;
  slug: string;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/** Type guard: check if an element is a NavItem (leaf page) */
export function isNavItem(item: NavItem | NavGroup): item is NavItem {
  return "path" in item;
}

/** Recursively flatten nested navigation into an ordered NavItem[] */
export function flattenNavigation(navigation: NavGroup[]): NavItem[] {
  const result: NavItem[] = [];
  for (const group of navigation) {
    for (const item of group.pages) {
      if (isNavItem(item)) {
        result.push(item);
      } else {
        result.push(...flattenNavigation([item]));
      }
    }
  }
  return result;
}
