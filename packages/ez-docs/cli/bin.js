#!/usr/bin/env node

// CLI 入口包装脚本 — 通过 tsx 运行 TypeScript 源码
// P2 抽包后此文件将改为指向编译后的 JS

const { execSync } = require("child_process");
const path = require("path");

const cliEntry = path.join(__dirname, "index.ts");
const args = process.argv.slice(2).join(" ");

try {
  execSync(`npx tsx ${cliEntry} ${args}`, {
    stdio: "inherit",
    cwd: process.cwd(),
  });
} catch (err) {
  process.exit(err.status ?? 1);
}
