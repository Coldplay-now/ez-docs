import fs from "fs";
import path from "path";

/**
 * 递归扫描目录下的 .md/.mdx 文件，返回相对于 baseDir 的 slug 列表（无扩展名）。
 * 共用于 docs.ts（导航构建）和 mdx.ts（slug 枚举）。
 */
export function scanMarkdownFiles(baseDir: string, subDir: string = ""): string[] {
  const fullDir = subDir ? path.join(baseDir, subDir) : baseDir;
  if (!fs.existsSync(fullDir)) return [];

  const result: string[] = [];
  const entries = fs.readdirSync(fullDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(fullDir, entry.name);
    if (entry.isDirectory()) {
      result.push(...scanMarkdownFiles(baseDir, path.join(subDir, entry.name)));
    } else if (/\.(md|mdx)$/.test(entry.name)) {
      const slug = path.join(subDir, entry.name.replace(/\.(md|mdx)$/, ""));
      result.push(slug);
    }
  }

  return result;
}
