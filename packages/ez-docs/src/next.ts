import type { NextConfig } from "next";
import fs from "fs";
import path from "path";
import { buildResolveAlias } from "./lib/component-registry";
import type { ResolvedEzdocConfig } from "./lib/config";

/**
 * 用户传给 withEzdoc() 的选项
 */
export interface EzdocPluginOptions {
  /** ezdoc.config.ts 中 defineConfig() 返回的配置对象 */
  config: ResolvedEzdocConfig;
  /** 用户的额外 Next.js 配置（会与 ez-docs 配置合并） */
  nextConfig?: Partial<NextConfig>;
}

/** 定位框架包的 src/ 目录，返回相对于 projectRoot 的相对路径 */
function resolveFrameworkSrcRelative(projectRoot: string): string {
  // 候选路径（按优先级）
  const candidates = [
    path.join(projectRoot, "node_modules", "ez-docs", "src"),
    // pnpm workspace link（monorepo 开发模式）
    path.join(projectRoot, "..", "packages", "ez-docs", "src"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const rel = path.relative(projectRoot, candidate);
      // Turbopack 要求 ./ 前缀的相对路径
      return rel.startsWith(".") ? rel : "./" + rel;
    }
  }

  // 回退：使用 import.meta.url（withEzdoc 本身在框架 src/ 中）
  const currentFileDir = path.dirname(new URL(import.meta.url).pathname);
  const frameworkSrc = currentFileDir; // next.ts is in src/
  const rel = path.relative(projectRoot, frameworkSrc);
  return rel.startsWith(".") ? rel : "./" + rel;
}

/**
 * ez-docs Next.js 插件。
 *
 * 用法（用户项目的 next.config.ts）：
 *
 * ```ts
 * import { withEzdoc } from "ez-docs/next";
 * import ezdocConfig from "./ezdoc.config";
 *
 * export default withEzdoc({ config: ezdocConfig });
 * ```
 */
export function withEzdoc(options: EzdocPluginOptions): NextConfig {
  const projectRoot = process.cwd();
  const ezdocConfig = options.config;

  const basePath = process.env.EZDOC_BASE_PATH ?? ezdocConfig.deploy.basePath;

  // 定位框架 src/ 目录的相对路径
  const frameworkSrcRel = resolveFrameworkSrcRelative(projectRoot);

  // 构建 Turbopack resolveAlias
  const resolveAlias: Record<string, string> = {
    // @config alias：让框架内部的 import("@config") 解析到用户项目的 ezdoc.config.ts
    "@config": "./ezdoc.config.ts",
    // @/* 通配符：让路由文件中的 @/lib/... 和 @/components/... 解析到框架 src/
    "@/*": frameworkSrcRel + "/*",
  };

  // 组件覆盖 alias（具体路径优先于通配符 @/*，T07 PoC 已验证）
  const overridesDir = path.join(projectRoot, ezdocConfig.overrides.dir);
  const overrideAlias = buildResolveAlias(overridesDir);
  Object.assign(resolveAlias, overrideAlias);

  if (Object.keys(overrideAlias).length > 0) {
    console.log(`[ez-docs] 检测到组件覆盖: ${Object.keys(overrideAlias).join(", ")}`);
  }

  // 合并用户的自定义 Next.js 配置
  const userNextConfig = options.nextConfig ?? {};

  return {
    ...userNextConfig,
    output: "export",
    basePath: basePath || undefined,
    trailingSlash: true,
    images: {
      unoptimized: true,
      ...userNextConfig.images,
    },
    env: {
      NEXT_PUBLIC_BASE_PATH: basePath || "",
      EZDOC_PROJECT_ROOT: projectRoot,
      ...userNextConfig.env,
    },
    turbopack: {
      resolveAlias,
      ...userNextConfig.turbopack,
    },
  };
}
