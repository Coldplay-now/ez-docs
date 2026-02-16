import fs from "fs";
import path from "path";
import { loadAndValidateConfig, GREEN, CYAN, YELLOW, RED, GRAY, BOLD, RESET } from "./utils";

async function initDeploy() {
  const target = process.argv[3] as "github" | "server" | undefined;

  if (!target || !["github", "server"].includes(target)) {
    console.error(`${RED}[ezdoc]${RESET} 请指定部署目标\n`);
    console.log(`${GRAY}用法:${RESET} pnpm ezdoc init-deploy <target>`);
    console.log(`${GRAY}目标:${RESET} github | server`);
    process.exit(1);
  }

  const config = await loadAndValidateConfig();
  const outputDir = config.deploy.output ?? "out";
  const workflowDir = path.join(process.cwd(), ".github", "workflows");

  fs.mkdirSync(workflowDir, { recursive: true });

  const destPath = path.join(workflowDir, "deploy.yml");

  if (fs.existsSync(destPath)) {
    console.warn(`${YELLOW}[ezdoc]${RESET} ${destPath} 已存在，将被覆盖`);
  }

  // 读取模板并替换变量
  const templateName = target === "github" ? "github-deploy.yml" : "server-deploy.yml";
  const templatePath = path.join(__dirname, "templates", templateName);
  let content = fs.readFileSync(templatePath, "utf-8");
  content = content.replace(/__OUTPUT_DIR__/g, outputDir);

  fs.writeFileSync(destPath, content, "utf-8");

  console.log(`${GREEN}[ezdoc]${RESET} 已生成 ${CYAN}.github/workflows/deploy.yml${RESET}\n`);

  if (target === "github") {
    console.log(`${BOLD}后续步骤:${RESET}`);
    console.log(`  1. 确保 ezdoc.config.ts 中 deploy.basePath 设置正确`);
    console.log(`  2. 在 GitHub 仓库 Settings > Pages 中选择 "GitHub Actions" 作为 Source`);
    console.log(`  3. git push 后会自动构建部署`);
  } else {
    console.log(`${BOLD}后续步骤:${RESET}`);
    console.log(`  在 GitHub 仓库 Settings > Secrets and variables > Actions 中设置:`);
    console.log(`    ${CYAN}DEPLOY_HOST${RESET}      服务器地址`);
    console.log(`    ${CYAN}DEPLOY_USER${RESET}      SSH 用户名`);
    console.log(`    ${CYAN}DEPLOY_PATH${RESET}      部署路径（如 /var/www/docs）`);
    console.log(`    ${CYAN}SSH_PRIVATE_KEY${RESET}   SSH 私钥`);
    console.log(`\n  git push 后会自动构建并 rsync 部署`);
  }
}

initDeploy();
