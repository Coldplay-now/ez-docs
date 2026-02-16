import fs from "fs";
import path from "path";
import { GREEN, GRAY, YELLOW, RESET } from "./utils";

/**
 * 框架路由文件同步到用户项目。
 *
 * 将 node_modules/ez-docs/src/app/ 的路由文件复制到用户项目的 src/app/，
 * 使 Next.js App Router 能正确识别路由。
 *
 * 版本检查：通过 .ezdoc/version 文件记录当前同步的版本号，
 * 仅在版本变化时重新复制。
 */

/** 获取框架包根目录（resolve ez-docs 的安装路径） */
function getFrameworkRoot(projectRoot: string): string {
  // 在 monorepo 中，packages/ez-docs 作为 workspace 包直接链接
  // 在用户项目中，通过 node_modules/ez-docs 安装
  const candidates = [
    // workspace link (pnpm)
    path.join(projectRoot, "node_modules", "ez-docs"),
    // 直接相邻目录 (monorepo dev)
    path.join(projectRoot, "..", "packages", "ez-docs"),
  ];

  for (const candidate of candidates) {
    const pkgJson = path.join(candidate, "package.json");
    if (fs.existsSync(pkgJson)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgJson, "utf-8"));
        if (pkg.name === "ez-docs") return candidate;
      } catch {
        // ignore parse error
      }
    }
  }

  // 最终回退：使用 require.resolve
  try {
    const pkgPath = path.dirname(
      require.resolve("ez-docs/package.json", { paths: [projectRoot] })
    );
    return pkgPath;
  } catch {
    throw new Error(
      "[ez-docs] 无法定位 ez-docs 包。请确保已安装 ez-docs 依赖。"
    );
  }
}

/** 获取框架版本号 */
function getFrameworkVersion(frameworkRoot: string): string {
  const pkgJson = path.join(frameworkRoot, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgJson, "utf-8"));
  return pkg.version ?? "0.0.0";
}

/** 获取上次同步的版本号 */
function getLastSyncedVersion(projectRoot: string): string | null {
  const versionFile = path.join(projectRoot, ".ezdoc", "version");
  if (fs.existsSync(versionFile)) {
    return fs.readFileSync(versionFile, "utf-8").trim();
  }
  return null;
}

/** 列出目录下所有文件的相对路径（排除 globals.css，与 copyAppDir 保持一致） */
function listFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const files: string[] = [];
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name !== "globals.css") {
        files.push(path.relative(dir, full));
      }
    }
  };
  walk(dir);
  return files.sort();
}

/** 检查源目录和目标目录的文件内容是否一致 */
function hasContentChanged(srcDir: string, destDir: string): boolean {
  const srcFiles = listFiles(srcDir);
  const destFiles = listFiles(destDir);
  if (srcFiles.length !== destFiles.length) return true;
  for (let i = 0; i < srcFiles.length; i++) {
    if (srcFiles[i] !== destFiles[i]) return true;
    const srcContent = fs.readFileSync(path.join(srcDir, srcFiles[i]));
    const destContent = fs.readFileSync(path.join(destDir, destFiles[i]));
    if (!srcContent.equals(destContent)) return true;
  }
  return false;
}

/** 写入同步版本号 */
function writeSyncedVersion(projectRoot: string, version: string): void {
  const ezdocDir = path.join(projectRoot, ".ezdoc");
  fs.mkdirSync(ezdocDir, { recursive: true });
  fs.writeFileSync(path.join(ezdocDir, "version"), version, "utf-8");
}

/** 递归复制目录 */
function copyDirSync(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/** 确保 .gitignore 包含指定条目 */
function ensureGitignore(projectRoot: string, entry: string): void {
  const gitignorePath = path.join(projectRoot, ".gitignore");
  let content = "";

  if (fs.existsSync(gitignorePath)) {
    content = fs.readFileSync(gitignorePath, "utf-8");
    // 已存在则跳过
    if (content.split("\n").some((line) => line.trim() === entry)) {
      return;
    }
  }

  // 追加
  const newline = content.endsWith("\n") ? "" : "\n";
  fs.writeFileSync(
    gitignorePath,
    content + newline + "\n# ez-docs generated\n" + entry + "\n",
    "utf-8"
  );
}

/**
 * 准备用户项目的路由文件。
 *
 * @param projectRoot 用户项目根目录
 * @param options.force 强制重新复制，跳过版本检查
 * @returns 是否执行了复制操作
 */
export function prepareRoutes(
  projectRoot: string,
  options: { force?: boolean } = {}
): boolean {
  const frameworkRoot = getFrameworkRoot(projectRoot);
  const frameworkVersion = getFrameworkVersion(frameworkRoot);
  const lastVersion = getLastSyncedVersion(projectRoot);

  // 版本 + 内容检查
  const appDir = path.join(projectRoot, "src", "app");
  const srcAppDir = path.join(frameworkRoot, "src", "app");
  const versionChanged = lastVersion !== frameworkVersion;
  const contentChanged =
    fs.existsSync(appDir) &&
    hasContentChanged(srcAppDir, appDir);
  const needsSync =
    options.force ||
    versionChanged ||
    contentChanged ||
    !fs.existsSync(appDir);

  if (!needsSync) {
    console.log(
      `${GRAY}[ez-docs]${RESET} 路由文件已是最新 (v${frameworkVersion})`
    );
    return false;
  }

  console.log(
    `${GRAY}[ez-docs]${RESET} 同步路由文件...`
  );

  // 源目录检查
  if (!fs.existsSync(srcAppDir)) {
    throw new Error(
      `[ez-docs] 框架路由目录不存在: ${srcAppDir}`
    );
  }

  // 清理旧路由（只清理 src/app 目录）
  if (fs.existsSync(appDir)) {
    fs.rmSync(appDir, { recursive: true });
  }

  // 确保 src/ 目录存在
  fs.mkdirSync(path.join(projectRoot, "src"), { recursive: true });

  // 复制路由文件（排除 globals.css，CSS 通过 @/styles/globals.css 别名引用）
  copyAppDir(srcAppDir, appDir);

  // 记录版本
  writeSyncedVersion(projectRoot, frameworkVersion);

  // 确保 .gitignore 包含 src/app/ 和 .ezdoc/
  ensureGitignore(projectRoot, "src/app/");
  ensureGitignore(projectRoot, ".ezdoc/");

  if (lastVersion) {
    console.log(
      `${GREEN}[ez-docs]${RESET} 路由文件已更新 (v${lastVersion} → v${frameworkVersion})`
    );
  } else {
    console.log(
      `${GREEN}[ez-docs]${RESET} 路由文件已同步 (v${frameworkVersion})`
    );
  }

  return true;
}

/** 复制 app/ 目录，排除 globals.css（通过别名引用） */
function copyAppDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyAppDir(srcPath, destPath);
    } else if (entry.name !== "globals.css") {
      // 排除 globals.css，通过 @/styles/globals.css 别名引用
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
