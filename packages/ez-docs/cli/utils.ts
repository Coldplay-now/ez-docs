import fs from "fs";
import path from "path";

// ─── ANSI 颜色 ──────────────────────────────────────────────

export const RED = "\x1b[31m";
export const GREEN = "\x1b[32m";
export const YELLOW = "\x1b[33m";
export const CYAN = "\x1b[36m";
export const GRAY = "\x1b[90m";
export const BOLD = "\x1b[1m";
export const RESET = "\x1b[0m";

// ─── 配置加载 ───────────────────────────────────────────────

/**
 * 动态加载 ezdoc.config.ts 并进行 Zod 校验。
 * CLI 环境中不能使用 @config 别名，需要直接 import 文件。
 */
export async function loadAndValidateConfig() {
  const configPath = path.join(process.cwd(), "ezdoc.config.ts");

  if (!fs.existsSync(configPath)) {
    console.error(`${RED}[ezdoc] 未找到 ezdoc.config.ts${RESET}`);
    process.exit(1);
  }

  // tsx 注册了 ts loader，可以直接 import .ts 文件
  const mod = await import(configPath);
  // defineConfig 已经做了 Zod 校验，直接返回
  return mod.default;
}

// ─── 目录扫描 ───────────────────────────────────────────────

/** 递归计算目录大小（字节） */
export function getDirSize(dir: string): number {
  let total = 0;
  if (!fs.existsSync(dir)) return 0;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += getDirSize(full);
    } else {
      total += fs.statSync(full).size;
    }
  }
  return total;
}

/** 统计目录下 .html 文件数量 */
export function countHtmlFiles(dir: string): number {
  let count = 0;
  if (!fs.existsSync(dir)) return 0;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += countHtmlFiles(full);
    } else if (entry.name.endsWith(".html")) {
      count++;
    }
  }
  return count;
}

/** 格式化字节为可读字符串 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
