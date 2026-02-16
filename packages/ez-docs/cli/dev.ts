import { execSync } from "child_process";
import { loadAndValidateConfig, GREEN, RESET } from "./utils";
import { prepareRoutes } from "./prepare";

async function dev() {
  // 启动前校验配置
  await loadAndValidateConfig();
  console.log(`${GREEN}[ezdoc]${RESET} 配置校验通过`);

  // 同步框架路由文件到用户项目
  prepareRoutes(process.cwd());

  console.log(`${GREEN}[ezdoc]${RESET} 启动开发服务器...\n`);
  execSync("next dev", { stdio: "inherit", cwd: process.cwd() });
}

dev();
