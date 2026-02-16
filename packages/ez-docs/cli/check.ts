import fs from "fs";
import path from "path";
import { loadAndValidateConfig, GREEN, CYAN, YELLOW, RED, GRAY, BOLD, RESET } from "./utils";

async function check() {
  console.log(`${GRAY}[ezdoc]${RESET} 检查项目...\n`);

  let errors = 0;
  let warnings = 0;
  let infos = 0;

  // 1. 配置合法性
  try {
    const config = await loadAndValidateConfig();
    console.log(`  ${GREEN}✓${RESET} ezdoc.config.ts 配置合法`);

    const docsDir = config.docs.dir ?? "docs";
    const navFileName = config.docs.nav ?? "docs.json";
    const locales: { code: string; label: string }[] = config.i18n.locales;
    const defaultLocale: string = config.i18n.defaultLocale;

    // 2. docs.json 合法性
    const { validateDocsJson } = await import("../src/lib/docs");

    for (const locale of locales) {
      const result = validateDocsJson(locale.code);
      if (!result.valid) {
        console.log(`  ${RED}✗${RESET} ${docsDir}/${locale.code}/${navFileName} 格式错误`);
        for (const w of result.warnings) {
          console.log(`    ${RED}${w}${RESET}`);
        }
        errors++;
      } else {
        console.log(`  ${GREEN}✓${RESET} ${docsDir}/${locale.code}/${navFileName} 格式正确`);
        for (const w of result.warnings) {
          console.log(`  ${YELLOW}⚠${RESET} ${w}`);
          warnings++;
        }
      }
    }

    // 3. 缺失翻译检查
    if (locales.length > 1) {
      const defaultDir = path.join(process.cwd(), docsDir, defaultLocale);
      const defaultFiles = scanMdFiles(defaultDir);

      for (const locale of locales) {
        if (locale.code === defaultLocale) continue;
        const localeDir = path.join(process.cwd(), docsDir, locale.code);
        const localeFiles = scanMdFiles(localeDir);

        for (const file of defaultFiles) {
          if (!localeFiles.includes(file)) {
            console.log(`  ${YELLOW}⚠${RESET} ${docsDir}/${locale.code}: 缺少 ${CYAN}${file}${RESET} 的翻译`);
            warnings++;
          }
        }
      }
    }

    // 4. 孤儿页面检查（存在文件但未在 docs.json 引用）
    for (const locale of locales) {
      const navFile = path.join(process.cwd(), docsDir, locale.code, navFileName);
      if (!fs.existsSync(navFile)) continue;

      const raw = fs.readFileSync(navFile, "utf-8");
      let json: { navigation?: { pages?: unknown[] }[] };
      try {
        json = JSON.parse(raw);
      } catch {
        continue;
      }

      // 收集 docs.json 中的所有路径
      const referencedPaths = new Set<string>();
      function collectPaths(pages: unknown[]): void {
        for (const page of pages) {
          if (typeof page === "string") {
            referencedPaths.add(page);
          } else if (typeof page === "object" && page !== null) {
            const obj = page as Record<string, unknown>;
            if ("path" in obj) referencedPaths.add(obj.path as string);
            if ("pages" in obj) collectPaths(obj.pages as unknown[]);
          }
        }
      }
      if (json.navigation) {
        for (const group of json.navigation) {
          if (group.pages) collectPaths(group.pages);
        }
      }

      // 扫描实际文件
      const localeDir = path.join(process.cwd(), docsDir, locale.code);
      const actualFiles = scanMdFiles(localeDir);

      for (const file of actualFiles) {
        if (!referencedPaths.has(file)) {
          console.log(`  ${GRAY}ℹ${RESET} ${docsDir}/${locale.code}/${file}.mdx 未被导航引用`);
          infos++;
        }
      }
    }
  } catch {
    console.log(`  ${RED}✗${RESET} ezdoc.config.ts 配置校验失败`);
    errors++;
  }

  // 汇总
  console.log("");
  const parts: string[] = [];
  if (errors > 0) parts.push(`${RED}${errors} error${errors > 1 ? "s" : ""}${RESET}`);
  if (warnings > 0) parts.push(`${YELLOW}${warnings} warning${warnings > 1 ? "s" : ""}${RESET}`);
  if (infos > 0) parts.push(`${GRAY}${infos} info${RESET}`);

  if (parts.length === 0) {
    console.log(`  ${GREEN}${BOLD}一切正常!${RESET}`);
  } else {
    console.log(`  ${parts.join(", ")}`);
  }

  process.exit(errors > 0 ? 1 : 0);
}

/** 递归扫描目录下的 .md/.mdx 文件，返回相对路径（无扩展名） */
function scanMdFiles(dir: string, base: string = ""): string[] {
  const result: string[] = [];
  if (!fs.existsSync(dir)) return result;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // 跳过 docs.json 等非目录
      result.push(...scanMdFiles(fullPath, path.join(base, entry.name)));
    } else if (/\.(md|mdx)$/.test(entry.name)) {
      const slug = path.join(base, entry.name.replace(/\.(md|mdx)$/, ""));
      result.push(slug);
    }
  }
  return result;
}

check();
