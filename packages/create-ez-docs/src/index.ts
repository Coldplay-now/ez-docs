#!/usr/bin/env node

import readline from "readline";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, "..", "templates");

// ─── ANSI Colors ────────────────────────────────────────────

const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

// ─── Utils ──────────────────────────────────────────────────

function ask(
  rl: readline.Interface,
  question: string
): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function choose(
  rl: readline.Interface,
  prompt: string,
  options: { label: string; value: string }[]
): Promise<string> {
  console.log(`\n  ${prompt}`);
  for (let i = 0; i < options.length; i++) {
    console.log(`    ${CYAN}${i + 1}${RESET}) ${options[i].label}`);
  }
  while (true) {
    const answer = await ask(rl, `  ${DIM}选择 (1-${options.length}): ${RESET}`);
    const idx = parseInt(answer.trim(), 10) - 1;
    if (idx >= 0 && idx < options.length) {
      return options[idx].value;
    }
    console.log(`  ${RED}请输入 1-${options.length} 之间的数字${RESET}`);
  }
}

// ─── Template Engine ────────────────────────────────────────

function renderTemplate(content: string, vars: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`__${key}__`, value);
  }
  return result;
}

function copyTemplate(
  src: string,
  dest: string,
  vars: Record<string, string>
): void {
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    // Replace __LOCALE__ in directory names
    const name = renderTemplate(entry.name, vars);
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, name);

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyTemplate(srcPath, destPath, vars);
    } else {
      const content = fs.readFileSync(srcPath, "utf-8");
      fs.writeFileSync(destPath, renderTemplate(content, vars), "utf-8");
    }
  }
}

// ─── Locale Config Builder ──────────────────────────────────

interface LocaleConfig {
  defaultLocale: string;
  locales: { code: string; label: string }[];
  localeDirs: string[];
}

function buildLocaleConfig(choice: string): LocaleConfig {
  switch (choice) {
    case "zh":
      return {
        defaultLocale: "zh",
        locales: [{ code: "zh", label: "中文" }],
        localeDirs: ["zh"],
      };
    case "en":
      return {
        defaultLocale: "en",
        locales: [{ code: "en", label: "English" }],
        localeDirs: ["en"],
      };
    case "zh+en":
      return {
        defaultLocale: "zh",
        locales: [
          { code: "zh", label: "中文" },
          { code: "en", label: "English" },
        ],
        localeDirs: ["zh", "en"],
      };
    default:
      return {
        defaultLocale: "zh",
        locales: [{ code: "zh", label: "中文" }],
        localeDirs: ["zh"],
      };
  }
}

// ─── Project Generator ──────────────────────────────────────

interface ProjectOptions {
  projectName: string;
  title: string;
  locale: string;
  deployTarget: string;
}

function generateProject(targetDir: string, options: ProjectOptions): void {
  const localeConfig = buildLocaleConfig(options.locale);

  // Template variables
  const vars: Record<string, string> = {
    PROJECT_NAME: options.projectName,
    TITLE: options.title,
    DEFAULT_LOCALE: localeConfig.defaultLocale,
    LOCALES: JSON.stringify(localeConfig.locales, null, 4)
      .split("\n")
      .map((line, i) => (i === 0 ? line : "    " + line))
      .join("\n"),
    DEPLOY_TARGET: options.deployTarget,
    LOCALE: localeConfig.defaultLocale,
  };

  // Create project directory
  fs.mkdirSync(targetDir, { recursive: true });

  // Copy template files (non-locale files)
  copyTemplate(TEMPLATES_DIR, targetDir, vars);

  // If bilingual, copy docs for second locale too
  if (localeConfig.localeDirs.length > 1) {
    const secondLocale = localeConfig.localeDirs[1];
    const srcDocsDir = path.join(
      TEMPLATES_DIR,
      "docs",
      "__LOCALE__"
    );
    const destDocsDir = path.join(targetDir, "docs", secondLocale);
    fs.mkdirSync(destDocsDir, { recursive: true });
    copyTemplate(srcDocsDir, destDocsDir, {
      ...vars,
      LOCALE: secondLocale,
    });
  }

  // Create .gitignore (can't name it .gitignore in templates — npm ignores it)
  const gitignorePath = path.join(targetDir, ".gitignore");
  fs.writeFileSync(
    gitignorePath,
    [
      "node_modules/",
      ".next/",
      "out/",
      ".ezdoc/",
      "src/app/",
      ".env",
      ".env.local",
      ".DS_Store",
      "*.tsbuildinfo",
    ].join("\n") + "\n",
    "utf-8"
  );
}

// ─── Main ───────────────────────────────────────────────────

async function main() {
  const projectName = process.argv[2];

  if (!projectName) {
    console.error(`\n  ${RED}用法: npx create-ez-docs <project-name>${RESET}\n`);
    process.exit(1);
  }

  // Check if directory already exists
  const targetDir = path.resolve(process.cwd(), projectName);
  if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
    console.error(`\n  ${RED}目录 ${projectName} 已存在且非空${RESET}\n`);
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(`\n  ${BOLD}${GREEN}✨ 创建 ez-docs 文档项目${RESET}\n`);

  // Interactive prompts
  const title = await ask(rl, `  ${BOLD}站点标题${RESET} ${DIM}(${projectName}): ${RESET}`);
  const siteTitle = title.trim() || projectName;

  const locale = await choose(rl, `${BOLD}默认语言:${RESET}`, [
    { label: "中文 (zh)", value: "zh" },
    { label: "English (en)", value: "en" },
    { label: "中文 + English (双语)", value: "zh+en" },
  ]);

  const deployTarget = await choose(rl, `${BOLD}部署目标:${RESET}`, [
    { label: "GitHub Pages", value: "github" },
    { label: "私有服务器", value: "server" },
    { label: "两者都有", value: "both" },
  ]);

  rl.close();

  // Generate project
  console.log(`\n  ${DIM}生成项目...${RESET}`);
  generateProject(targetDir, {
    projectName,
    title: siteTitle,
    locale,
    deployTarget,
  });

  // Detect package manager
  const userAgent = process.env.npm_config_user_agent ?? "";
  let pm = "pnpm";
  if (userAgent.startsWith("yarn")) pm = "yarn";
  else if (userAgent.startsWith("npm")) pm = "npm";
  else if (userAgent.startsWith("bun")) pm = "bun";

  console.log(`\n  ${GREEN}${BOLD}✅ 项目已创建!${RESET}\n`);
  console.log(`  运行以下命令开始:\n`);
  console.log(`    ${CYAN}cd ${projectName}${RESET}`);
  console.log(`    ${CYAN}${pm} install${RESET}`);
  console.log(`    ${CYAN}${pm === "npm" ? "npx" : pm} ezdoc dev${RESET}`);
  console.log();
}

main().catch((err) => {
  console.error(`\n  ${RED}错误: ${err instanceof Error ? err.message : err}${RESET}\n`);
  process.exit(1);
});
