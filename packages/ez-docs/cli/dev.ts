import { execSync } from "child_process";
import { loadAndValidateConfig, GREEN, RESET } from "./utils";

async function dev() {
  // 启动前校验配置
  await loadAndValidateConfig();
  console.log(`${GREEN}[ezdoc]${RESET} 配置校验通过，启动开发服务器...\n`);

  execSync("next dev", { stdio: "inherit", cwd: process.cwd() });
}

dev();
