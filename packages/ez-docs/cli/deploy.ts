import { execSync } from "child_process";
import path from "path";
import { loadAndValidateConfig, GREEN, CYAN, RED, GRAY, BOLD, RESET } from "./utils";

async function deploy() {
  const config = await loadAndValidateConfig();
  const target = config.deploy.target as string;
  const outputDir = config.deploy.output ?? "out";

  // 先构建
  console.log(`${GRAY}[ezdoc]${RESET} 开始构建...\n`);
  execSync("pnpm ezdoc build", { stdio: "inherit", cwd: process.cwd() });

  // 根据 target 分发
  if (target === "github" || target === "both") {
    await deployGitHub(outputDir);
  }
  if (target === "server" || target === "both") {
    await deployServer(config, outputDir);
  }

  console.log(`\n${GREEN}${BOLD}[ezdoc] 部署完成!${RESET}`);
}

async function deployGitHub(outputDir: string) {
  console.log(`\n${GRAY}[ezdoc]${RESET} 部署到 GitHub Pages...\n`);

  // 检查 git 状态
  try {
    execSync("git remote get-url origin", { encoding: "utf-8", stdio: "pipe" });
  } catch {
    console.error(`${RED}[ezdoc]${RESET} 未找到 git remote origin，请先初始化 git 仓库`);
    process.exit(1);
  }

  // 检查是否安装了 gh-pages（运行时安装）
  try {
    execSync(`npx gh-pages -d ${outputDir}`, { stdio: "inherit", cwd: process.cwd() });
  } catch (err) {
    console.error(`${RED}[ezdoc]${RESET} GitHub Pages 部署失败`);
    console.error((err as Error).message);
    process.exit(1);
  }

  console.log(`${GREEN}[ezdoc]${RESET} 已部署到 GitHub Pages (gh-pages 分支)`);
}

async function deployServer(
  config: { deploy: { server?: { host: string; user: string; path: string; port?: number } } },
  outputDir: string,
) {
  console.log(`\n${GRAY}[ezdoc]${RESET} 部署到服务器...\n`);

  const server = config.deploy.server;
  if (!server) {
    console.error(`${RED}[ezdoc]${RESET} deploy.target 包含 "server" 但未配置 deploy.server`);
    process.exit(1);
  }

  const { host, user, path: remotePath, port } = server;
  const portFlag = port && port !== 22 ? `-e 'ssh -p ${port}'` : "";

  // 检查 SSH 连接
  console.log(`${GRAY}[ezdoc]${RESET} 检查 SSH 连接 ${CYAN}${user}@${host}${RESET}...`);
  try {
    execSync(`ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=accept-new ${portFlag ? `-p ${port}` : ""} ${user}@${host} echo ok`, {
      stdio: "pipe",
    });
  } catch {
    console.error(`${RED}[ezdoc]${RESET} 无法连接到 ${user}@${host}，请检查 SSH 配置`);
    process.exit(1);
  }

  // 检查 rsync
  try {
    execSync("which rsync", { stdio: "pipe" });
  } catch {
    console.error(`${RED}[ezdoc]${RESET} 未找到 rsync 命令，请先安装`);
    process.exit(1);
  }

  // rsync 部署
  const outputPath = path.join(process.cwd(), outputDir);
  const rsyncCmd = `rsync -avz --delete ${portFlag} ${outputPath}/ ${user}@${host}:${remotePath}/`;

  console.log(`${GRAY}[ezdoc]${RESET} 执行 rsync...\n`);
  execSync(rsyncCmd, { stdio: "inherit" });

  console.log(`\n${GREEN}[ezdoc]${RESET} 已部署到 ${CYAN}${host}:${remotePath}${RESET}`);
}

deploy();
