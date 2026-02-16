#!/usr/bin/env node

const COMMANDS: Record<string, () => Promise<unknown>> = {
  dev: () => import("./dev"),
  build: () => import("./build"),
  new: () => import("./new-page"),
  check: () => import("./check"),
  deploy: () => import("./deploy"),
  "init-deploy": () => import("./init-deploy"),
};

const CYAN = "\x1b[36m";
const GRAY = "\x1b[90m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function printUsage() {
  console.log(`
${BOLD}ezdoc${RESET} — 文档站点框架 CLI

${BOLD}用法:${RESET}
  pnpm ezdoc <command>

${BOLD}命令:${RESET}
  ${CYAN}dev${RESET}            启动开发服务器
  ${CYAN}build${RESET}          构建静态站点
  ${CYAN}new${RESET} <path>     创建新文档页
  ${CYAN}check${RESET}          校验配置与文档
  ${CYAN}deploy${RESET}         构建并部署
  ${CYAN}init-deploy${RESET}    初始化部署配置

${GRAY}示例:${RESET}
  pnpm ezdoc dev
  pnpm ezdoc build
  pnpm ezdoc new guide/advanced-config
  pnpm ezdoc check
  pnpm ezdoc deploy
  pnpm ezdoc init-deploy github
`);
}

async function main() {
  const command = process.argv[2];

  if (!command || command === "--help" || command === "-h") {
    printUsage();
    process.exit(0);
  }

  if (!(command in COMMANDS)) {
    console.error(`[ezdoc] 未知命令: ${command}\n`);
    printUsage();
    process.exit(1);
  }

  await COMMANDS[command]();
}

main().catch((err) => {
  console.error("[ezdoc] 执行失败:", err instanceof Error ? err.message : err);
  process.exit(1);
});
