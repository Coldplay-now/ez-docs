import fs from "fs";
import path from "path";
import { execSync } from "child_process";

import { z } from "zod";
import type { ResolvedEzdocConfig } from "./config";
import { getProjectRoot, loadConfig } from "./config-loader";

// Re-export client-safe types and utilities
export type { NavItem, NavGroup, TocItem, DocMeta, BreadcrumbItem } from "./nav-types";
export { isNavItem, flattenNavigation } from "./nav-types";

import { type NavItem, type NavGroup, type TocItem, type BreadcrumbItem, isNavItem, flattenNavigation } from "./nav-types";
import { scanMarkdownFiles } from "./file-scanner";

// ─── locale 辅助 ────────────────────────────────────────────

/** 获取默认 locale */
export async function getDefaultLocale(): Promise<string> {
  const config = await loadConfig();
  return config.i18n.defaultLocale;
}

/** 获取所有 locale code 列表 */
export async function getAllLocales(): Promise<string[]> {
  const config = await loadConfig();
  return config.i18n.locales.map((l) => l.code);
}

// ─── 内部工具 ───────────────────────────────────────────────

/** 从配置获取 docs 目录路径（locale 子目录） */
function getDocsDir(locale: string, config: ResolvedEzdocConfig): string {
  const dir = config.docs.dir;
  return path.join(getProjectRoot(), dir, locale);
}

/** 从配置获取导航配置文件名 */
function getNavFileName(config: ResolvedEzdocConfig): string {
  return config.docs.nav;
}

/** 读取 markdown/mdx 文件的 frontmatter（简易 YAML 解析，无需 gray-matter） */
function readFrontmatter(filePath: string): Record<string, string> {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return {};

    const data: Record<string, string> = {};
    for (const line of match[1].split("\n")) {
      const kv = line.match(/^(\w+)\s*:\s*(.+)$/);
      if (kv) {
        data[kv[1]] = kv[2].replace(/^["']|["']$/g, "").trim();
      }
    }
    return data;
  } catch (err) {
    console.warn(
      `[ezdoc] Failed to read frontmatter from ${filePath}: ${err instanceof Error ? err.message : err}`
    );
    return {};
  }
}

/** 根据 slug 解析出文件的绝对路径（尝试 .mdx 和 .md） */
function resolveDocFile(slug: string, locale: string, config: ResolvedEzdocConfig): string | null {
  const docsDir = getDocsDir(locale, config);
  const extensions = [".mdx", ".md"];
  for (const ext of extensions) {
    const filePath = path.join(docsDir, slug + ext);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

/** 从文件系统读取 slug 对应的标题 */
function getTitleForSlug(slug: string, locale: string, config: ResolvedEzdocConfig): string {
  const filePath = resolveDocFile(slug, locale, config);
  if (!filePath) return slug;
  const fm = readFrontmatter(filePath);
  return (fm.title as string) || path.basename(slug);
}

// ─── docs.json Zod schema ────────────────────────────────────

const navPageSchema: z.ZodType<string | { title: string; path: string } | { group: string; pages: unknown[] }> = z.union([
  z.string(),
  z.object({ title: z.string(), path: z.string() }),
  z.object({
    group: z.string(),
    pages: z.lazy(() => z.array(navPageSchema)),
  }),
]);

const docsJsonSchema = z.object({
  navigation: z.array(z.object({
    group: z.string(),
    pages: z.array(navPageSchema),
  })),
});

/** 校验 docs.json 并返回解析后的导航，供 CLI check 命令使用 */
export async function validateDocsJson(locale: string): Promise<{ valid: boolean; warnings: string[] }> {
  const config = await loadConfig();
  const docsDir = getDocsDir(locale, config);
  const navFile = path.join(docsDir, getNavFileName(config));
  const warnings: string[] = [];

  if (!fs.existsSync(navFile)) {
    return { valid: true, warnings: [`${navFile} 不存在，将使用目录扫描`] };
  }

  const raw = fs.readFileSync(navFile, "utf-8");
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { valid: false, warnings: [`${navFile} 不是合法的 JSON`] };
  }

  const result = docsJsonSchema.safeParse(json);
  if (!result.success) {
    for (const issue of result.error.issues) {
      warnings.push(`${issue.path.join(".")}: ${issue.message}`);
    }
    return { valid: false, warnings };
  }

  // 逻辑校验：文件存在性 + 路径重复
  const paths: string[] = [];
  function collectPaths(pages: unknown[]): void {
    for (const page of pages) {
      if (typeof page === "string") {
        paths.push(page);
      } else if (typeof page === "object" && page !== null) {
        const obj = page as Record<string, unknown>;
        if ("path" in obj) paths.push(obj.path as string);
        if ("pages" in obj) collectPaths(obj.pages as unknown[]);
      }
    }
  }
  for (const group of result.data.navigation) {
    collectPaths(group.pages);
  }

  // 检查重复路径
  const seen = new Set<string>();
  for (const p of paths) {
    if (seen.has(p)) {
      warnings.push(`路径 "${p}" 重复出现`);
    }
    seen.add(p);
  }

  // 检查文件存在性
  for (const p of paths) {
    if (!resolveDocFile(p, locale, config)) {
      warnings.push(`路径 "${p}" 对应的 .md/.mdx 文件不存在`);
    }
  }

  return { valid: true, warnings };
}

// ─── getNavigation ──────────────────────────────────────────

/**
 * 获取导航结构。
 * 优先从 docs/{locale}/docs.json 读取，不存在则回退到目录扫描。
 */
export async function getNavigation(locale: string): Promise<NavGroup[]> {
  const config = await loadConfig();
  const docsDir = getDocsDir(locale, config);
  const navFile = path.join(docsDir, getNavFileName(config));

  // 1. 优先读取 docs.json
  if (fs.existsSync(navFile)) {
    return parseNavFile(navFile, locale, config);
  }

  // 2. 回退：扫描目录
  return buildNavFromDirectory(docsDir, locale, config);
}

/** 解析 docs.json 导航配置文件 */
function parseNavFile(navFile: string, locale: string, config: ResolvedEzdocConfig): NavGroup[] {
  const raw = fs.readFileSync(navFile, "utf-8");

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    console.error(
      `[ezdoc] Failed to parse ${navFile}: ${err instanceof Error ? err.message : err}`
    );
    return [];
  }

  const result = docsJsonSchema.safeParse(json);
  if (!result.success) {
    console.error(`[ezdoc] ${navFile} 格式错误:`);
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    return [];
  }

  return result.data.navigation.map((group) => resolveNavGroup(group, locale, config));
}

/** Recursively resolve a navigation group, reading titles from frontmatter */
function resolveNavGroup(raw: { group: string; pages: unknown[] }, locale: string, config: ResolvedEzdocConfig): NavGroup {
  return {
    group: raw.group,
    pages: raw.pages.map((page): NavItem | NavGroup => {
      if (typeof page === "string") {
        return { title: getTitleForSlug(page, locale, config), path: page };
      }
      const obj = page as Record<string, unknown>;
      if ("group" in obj && "pages" in obj) {
        return resolveNavGroup(obj as { group: string; pages: unknown[] }, locale, config);
      }
      return { title: (obj.title as string) ?? "", path: (obj.path as string) ?? "" };
    }),
  };
}

/** 扫描目录构建导航（回退方案） */
function buildNavFromDirectory(docsDir: string, locale: string, config: ResolvedEzdocConfig): NavGroup[] {
  const slugs = scanMarkdownFiles(docsDir);
  slugs.sort((a, b) => a.localeCompare(b));

  const groups = new Map<string, NavItem[]>();

  for (const slug of slugs) {
    const dir = path.dirname(slug);
    const groupName = dir === "." ? "文档" : dir;

    if (!groups.has(groupName)) {
      groups.set(groupName, []);
    }

    const filePath = resolveDocFile(slug, locale, config);
    const fm = filePath ? readFrontmatter(filePath) : {};
    const title = (fm.title as string) || path.basename(slug);

    const group = groups.get(groupName);
    if (group) {
      group.push({ title, path: slug });
    }
  }

  return Array.from(groups.entries()).map(([group, pages]) => ({
    group,
    pages,
  }));
}

// ─── extractToc ─────────────────────────────────────────────

/**
 * 从 markdown 原始内容中提取 h2-h4 标题，生成目录。
 */
export function extractToc(rawContent: string): TocItem[] {
  const items: TocItem[] = [];
  const lines = rawContent.split("\n");
  let inCodeBlock = false;

  for (const line of lines) {
    // 跳过围栏代码块
    if (/^```/.test(line.trimStart())) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    // 跳过缩进代码块（4 空格或 1 tab 开头）
    if (/^(?:    |\t)/.test(line)) continue;

    const match = line.match(/^(#{2,4})\s+(.+)$/);
    if (!match) continue;

    const depth = match[1].length as 2 | 3 | 4;
    const text = match[2].trim();
    const id = generateId(text);

    items.push({ depth, text, id });
  }

  return items;
}

/** 生成标题 id：中文保留，空格转 -，转小写 */
function generateId(text: string): string {
  const id = text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u4e00-\u9fff-]/g, "");
  return id || "section";
}

// ─── getPrevNext ────────────────────────────────────────────

/**
 * 根据当前 slug，在导航树中查找前一页和后一页。
 */
export function getPrevNext(
  currentSlug: string,
  navigation: NavGroup[]
): { prev: NavItem | null; next: NavItem | null } {
  // 将导航树扁平化为有序列表
  const flat: NavItem[] = flattenNavigation(navigation);

  const index = flat.findIndex((item) => item.path === currentSlug);

  if (index === -1) {
    return { prev: null, next: null };
  }

  return {
    prev: index > 0 ? flat[index - 1] : null,
    next: index < flat.length - 1 ? flat[index + 1] : null,
  };
}

// ─── getBreadcrumbs ──────────────────────────────────────────

/**
 * 根据当前 slug，在导航树中查找面包屑路径。
 */
export function getBreadcrumbs(
  slug: string,
  navigation: NavGroup[],
  locale: string,
): BreadcrumbItem[] {
  const root: BreadcrumbItem = { label: "文档", href: `/docs/${locale}` };

  function search(
    groups: NavGroup[],
    trail: BreadcrumbItem[],
  ): BreadcrumbItem[] | null {
    for (const group of groups) {
      const groupCrumb: BreadcrumbItem = { label: group.group };
      for (const item of group.pages) {
        if (isNavItem(item)) {
          if (item.path === slug) {
            return [...trail, groupCrumb, { label: item.title }];
          }
        } else {
          const found = search([item], [...trail, groupCrumb]);
          if (found) return found;
        }
      }
    }
    return null;
  }

  const found = search(navigation, [root]);
  return found ?? [root, { label: slug }];
}

// ─── getLastModified ─────────────────────────────────────────

/**
 * 通过 git log 获取文档文件的最后修改时间（ISO 8601）。
 */
export async function getLastModified(slug: string, locale: string): Promise<string | null> {
  const config = await loadConfig();
  const filePath = resolveDocFile(slug, locale, config);
  if (!filePath) return null;
  try {
    const timestamp = execSync(
      `git log -1 --format=%aI -- "${filePath}"`,
      { encoding: "utf-8", timeout: 5000 },
    ).trim();
    return timestamp || null;
  } catch {
    return null;
  }
}
