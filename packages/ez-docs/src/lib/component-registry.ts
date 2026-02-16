import fs from "fs";
import path from "path";

/**
 * 可覆盖组件注册表
 *
 * key: 组件文件名（不含扩展名）
 * category: "mdx" | "layout"
 * exports: 该文件导出的组件名列表
 */
export const COMPONENT_REGISTRY = {
  // ─── MDX 组件 ─────────────────────────
  mdx: {
    callout:      { exports: ["Callout"] },
    tabs:         { exports: ["Tabs", "TabItem"] },
    steps:        { exports: ["Steps", "Step"] },
    card:         { exports: ["Card", "CardGroup"] },
    accordion:    { exports: ["Accordion", "AccordionItem"] },
    "file-tree":  { exports: ["FileTree"] },
    badge:        { exports: ["Badge"] },
    video:        { exports: ["Video"] },
    "image-zoom": { exports: ["ImageZoom"] },
    tooltip:      { exports: ["Tooltip"] },
    "code-group": { exports: ["CodeGroup"] },
    "code-pre":   { exports: ["CodePre"] },
    mermaid:      { exports: ["Mermaid"] },
  },
  // ─── Layout 组件 ──────────────────────
  layout: {
    header:         { exports: ["Header"] },
    sidebar:        { exports: ["Sidebar"] },
    toc:            { exports: ["TableOfContents"] },
    breadcrumb:     { exports: ["Breadcrumb"] },
    "doc-pagination": { exports: ["DocPagination"] },
    footer:         { exports: ["Footer"] },
  },
} as const;

/**
 * 扫描 overrides 目录，构建 Turbopack resolveAlias 映射。
 *
 * 返回形如：
 * {
 *   "@/components/mdx/callout": "/absolute/path/to/overrides/mdx/callout",
 *   "@/components/layout/footer": "/absolute/path/to/overrides/layout/footer",
 * }
 */
export function buildResolveAlias(overridesDir: string): Record<string, string> {
  const alias: Record<string, string> = {};

  for (const [category, components] of Object.entries(COMPONENT_REGISTRY)) {
    const categoryDir = path.join(overridesDir, category);
    if (!fs.existsSync(categoryDir)) continue;

    for (const name of Object.keys(components)) {
      const overridePath = path.join(categoryDir, name);
      if (
        fs.existsSync(overridePath + ".tsx") ||
        fs.existsSync(overridePath + ".ts") ||
        fs.existsSync(overridePath + ".jsx") ||
        fs.existsSync(overridePath + ".js")
      ) {
        alias[`@/components/${category}/${name}`] = overridePath;
      }
    }
  }

  return alias;
}
