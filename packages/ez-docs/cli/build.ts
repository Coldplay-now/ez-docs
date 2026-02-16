import { execSync } from "child_process";
import path from "path";
import {
  loadAndValidateConfig,
  countHtmlFiles,
  getDirSize,
  formatBytes,
  GREEN,
  CYAN,
  GRAY,
  BOLD,
  RESET,
  RED,
} from "./utils";

async function build() {
  const startTime = Date.now();

  // 1. 校验 ezdoc.config.ts
  console.log(`${GRAY}[ezdoc]${RESET} 校验配置...`);
  const config = await loadAndValidateConfig();
  console.log(`${GREEN}[ezdoc]${RESET} 配置校验通过`);

  // 2. 校验所有 locale 的 docs.json
  console.log(`${GRAY}[ezdoc]${RESET} 校验导航配置...`);
  const { validateDocsJson } = await import("../src/lib/docs");
  const locales: { code: string; label: string }[] = config.i18n.locales;

  let hasError = false;
  for (const locale of locales) {
    const result = validateDocsJson(locale.code);
    if (!result.valid) {
      console.error(`${RED}[ezdoc]${RESET} docs.json (${locale.code}) 校验失败:`);
      for (const w of result.warnings) {
        console.error(`  ${RED}✗${RESET} ${w}`);
      }
      hasError = true;
    } else if (result.warnings.length > 0) {
      for (const w of result.warnings) {
        console.warn(`  ${CYAN}⚠${RESET} ${w}`);
      }
    }
  }

  if (hasError) {
    console.error(`\n${RED}[ezdoc]${RESET} 导航配置有误，构建中止。`);
    process.exit(1);
  }
  console.log(`${GREEN}[ezdoc]${RESET} 导航配置校验通过`);

  // 3. next build
  console.log(`\n${GRAY}[ezdoc]${RESET} 执行 next build...\n`);
  execSync("next build", { stdio: "inherit", cwd: process.cwd() });

  // 4. pagefind
  const outputDir = config.deploy.output ?? "out";
  const outputPath = path.join(process.cwd(), outputDir);
  console.log(`\n${GRAY}[ezdoc]${RESET} 生成搜索索引...\n`);
  execSync(`pagefind --site ${outputDir}`, { stdio: "inherit", cwd: process.cwd() });

  // 5. 构建报告
  printBuildReport(config, outputPath, startTime);
}

function printBuildReport(
  config: { i18n: { locales: { code: string }[] }; deploy: { target: string; basePath: string; output: string } },
  outputPath: string,
  startTime: number,
) {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const pageCount = countHtmlFiles(outputPath);
  const totalSize = formatBytes(getDirSize(outputPath));
  const localeCodes = config.i18n.locales.map((l: { code: string }) => l.code).join(", ");
  const target = config.deploy.target;
  const basePath = config.deploy.basePath || "/";

  console.log(`
${BOLD}┌──────────────────────────────────────────────┐${RESET}
${BOLD}│${RESET}  ${GREEN}ezdoc build 完成${RESET}                             ${BOLD}│${RESET}
${BOLD}│${RESET}                                              ${BOLD}│${RESET}
${BOLD}│${RESET}  页面数:     ${CYAN}${String(pageCount).padEnd(34)}${RESET}${BOLD}│${RESET}
${BOLD}│${RESET}  语言:       ${CYAN}${localeCodes.padEnd(34)}${RESET}${BOLD}│${RESET}
${BOLD}│${RESET}  输出目录:   ${CYAN}${(config.deploy.output + "/ (" + totalSize + ")").padEnd(34)}${RESET}${BOLD}│${RESET}
${BOLD}│${RESET}  构建耗时:   ${CYAN}${(elapsed + "s").padEnd(34)}${RESET}${BOLD}│${RESET}
${BOLD}│${RESET}                                              ${BOLD}│${RESET}
${BOLD}│${RESET}  部署目标:   ${CYAN}${(target + " (basePath: " + basePath + ")").padEnd(34)}${RESET}${BOLD}│${RESET}
${BOLD}│${RESET}  就绪:       ${GREEN}${"可直接部署".padEnd(30)}${RESET}${BOLD}│${RESET}
${BOLD}└──────────────────────────────────────────────┘${RESET}
`);
}

build();
