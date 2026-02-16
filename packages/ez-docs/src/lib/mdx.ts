import type React from "react";
import fs from "node:fs";
import path from "node:path";
import { compileMDX as _compileMDX } from "next-mdx-remote/rsc";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeMdxImportMedia from "rehype-mdx-import-media";
import type { Options as RehypePrettyCodeOptions } from "rehype-pretty-code";

import type { ResolvedEzdocConfig } from "./config";
import { getProjectRoot, loadConfig } from "./config-loader";
import { scanMarkdownFiles } from "./file-scanner";

// ---------------------------------------------------------------------------
// Frontmatter type
// ---------------------------------------------------------------------------
export interface Frontmatter {
  title?: string;
  description?: string;
  date?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Resolve docs directory from ezdoc.config.ts
// ---------------------------------------------------------------------------
function getDocsDir(locale: string, config: ResolvedEzdocConfig): string {
  const dir = config.docs.dir;
  return path.join(dir, locale);
}

// ---------------------------------------------------------------------------
// 1. compileMDX
// ---------------------------------------------------------------------------
export async function compileMDX(
  source: string,
  options?: { components?: Record<string, React.ComponentType<unknown>> },
) {
  const rehypePrettyCodeOptions: RehypePrettyCodeOptions = {
    theme: {
      dark: "github-dark",
      light: "github-light",
    },
    keepBackground: false,
  };

  const { content, frontmatter } = await _compileMDX<Frontmatter>({
    source,
    components: options?.components,
    options: {
      parseFrontmatter: true,
      mdxOptions: {
        remarkPlugins: [remarkFrontmatter, remarkGfm, remarkMath],
        rehypePlugins: [
          rehypeKatex,
          [rehypePrettyCode, rehypePrettyCodeOptions],
          rehypeSlug,
          rehypeAutolinkHeadings,
          rehypeMdxImportMedia,
        ],
      },
    },
  });

  return { content, frontmatter };
}

// ---------------------------------------------------------------------------
// 2. getDocBySlug
// ---------------------------------------------------------------------------
export async function getDocBySlug(
  slug: string,
  locale: string,
  options?: { components?: Record<string, React.ComponentType<unknown>> },
) {
  const config = await loadConfig();
  const docsDir = getDocsDir(locale, config);
  const basePath = path.join(getProjectRoot(), docsDir);

  // 路径安全校验：防止路径遍历攻击
  if (slug.includes("..") || slug.startsWith("/")) {
    throw new Error(`Invalid slug: ${slug}`);
  }

  // slug 可能是 "getting-started" 或 "guide/intro" 等形式
  const slugParts = slug.split("/");
  const mdxPath = path.join(basePath, ...slugParts) + ".mdx";
  const mdPath = path.join(basePath, ...slugParts) + ".md";

  // 优先 .mdx
  let filePath: string;
  if (fs.existsSync(mdxPath)) {
    filePath = mdxPath;
  } else if (fs.existsSync(mdPath)) {
    filePath = mdPath;
  } else {
    throw new Error(`Document not found for slug: ${slug} (locale: ${locale})`);
  }

  const raw = fs.readFileSync(filePath, "utf-8");

  // compileMDX 已通过 parseFrontmatter: true 解析 frontmatter，
  // 无需再用 gray-matter 重复解析
  const { content, frontmatter } = await compileMDX(raw, {
    components: options?.components,
  });

  return {
    content,
    frontmatter: frontmatter as Frontmatter,
    raw,
    slug,
  };
}

// ---------------------------------------------------------------------------
// 3. getAllSlugs
// ---------------------------------------------------------------------------
/**
 * 获取所有文档 slug。
 * - 传入 locale：返回该语言下的 slug 列表（如 "getting-started", "guide/intro"）
 * - 不传 locale：返回所有语言的 slug，格式为 "{locale}/{slug}"（供 sitemap 使用）
 */
export async function getAllSlugs(locale?: string): Promise<string[]> {
  const config = await loadConfig();
  const dir = config.docs.dir;
  const root = getProjectRoot();

  if (locale) {
    // 返回指定 locale 下的 slugs
    const basePath = path.join(root, dir, locale);
    return scanMarkdownFiles(basePath);
  }

  // 不指定 locale：遍历所有 locale，返回 "{locale}/{slug}" 格式
  const locales = config.i18n.locales.map((l) => l.code);

  const slugs: string[] = [];
  for (const loc of locales) {
    const basePath = path.join(root, dir, loc);
    for (const slug of scanMarkdownFiles(basePath)) {
      slugs.push(`${loc}/${slug}`);
    }
  }
  return slugs;
}
