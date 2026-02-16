#!/usr/bin/env tsx

/**
 * 读取 ezdoc.config.ts 中的部署配置，输出为 GitHub Actions 可用的格式。
 * 供 CI 工作流调用，替代 regex 解析 TS 文件。
 *
 * 用法: tsx cli/read-deploy-config.ts
 * 输出:
 *   deploy-target=server
 *   deploy-server=true
 *   server-path=/var/www/docs
 */

import path from "path";

async function main() {
  const configPath = path.join(process.cwd(), "ezdoc.config.ts");
  const mod = await import(configPath);
  const config = mod.default;

  const target = config.deploy?.target ?? "github";
  const serverPath = config.deploy?.server?.path ?? "/var/www/docs";
  const deployServer = target === "server" || target === "both";

  console.log(`deploy-target=${target}`);
  console.log(`deploy-server=${deployServer}`);
  console.log(`server-path=${serverPath}`);
}

main().catch((err) => {
  console.error("Failed to read deploy config:", err.message);
  // 回退到安全默认值
  console.log("deploy-target=github");
  console.log("deploy-server=false");
  console.log("server-path=/var/www/docs");
});
