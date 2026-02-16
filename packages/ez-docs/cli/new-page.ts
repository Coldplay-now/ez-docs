import fs from "fs";
import path from "path";
import { loadAndValidateConfig, GREEN, CYAN, RED, RESET, GRAY } from "./utils";

async function newPage() {
  const pagePath = process.argv[3];

  if (!pagePath) {
    console.error(`${RED}[ezdoc]${RESET} 请指定文档路径\n`);
    console.log(`${GRAY}用法:${RESET} pnpm ezdoc new <path>`);
    console.log(`${GRAY}示例:${RESET} pnpm ezdoc new guide/advanced-config`);
    process.exit(1);
  }

  // 路径安全校验
  if (
    pagePath.includes("..") ||
    path.isAbsolute(pagePath) ||
    /[<>:"|?*\x00-\x1f]/.test(pagePath)
  ) {
    console.error(`${RED}[ezdoc]${RESET} 无效的文档路径: ${pagePath}`);
    console.error(`${GRAY}路径不能包含 ".."、绝对路径或特殊字符${RESET}`);
    process.exit(1);
  }

  const config = await loadAndValidateConfig();
  const docsDir = config.docs.dir ?? "docs";
  const locales: { code: string; label: string }[] = config.i18n.locales;
  const baseName = path.basename(pagePath);

  // 生成 frontmatter 模板
  const template = `---
title: ${baseName}
description: ""
---

# ${baseName}
`;

  let created = 0;
  for (const locale of locales) {
    const filePath = path.join(process.cwd(), docsDir, locale.code, pagePath + ".mdx");
    const dir = path.dirname(filePath);

    if (fs.existsSync(filePath)) {
      console.log(`  ${GRAY}跳过${RESET} ${filePath} (已存在)`);
      continue;
    }

    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, template, "utf-8");
    console.log(`  ${GREEN}✓${RESET} 创建 ${CYAN}${docsDir}/${locale.code}/${pagePath}.mdx${RESET}`);
    created++;
  }

  if (created > 0) {
    console.log(`\n${GREEN}[ezdoc]${RESET} 已创建 ${created} 个文件`);
    console.log(`${GRAY}[ezdoc]${RESET} 请手动更新 docs.json 添加导航条目`);
  } else {
    console.log(`\n${GRAY}[ezdoc]${RESET} 所有文件已存在，无需创建`);
  }
}

newPage();
