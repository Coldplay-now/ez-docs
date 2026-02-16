import type { ResolvedEzdocConfig } from "./config";

/**
 * 获取用户项目根目录。
 *
 * 优先级：
 * 1. EZDOC_PROJECT_ROOT 环境变量（由 withEzdoc() 设置）
 * 2. process.cwd()
 */
export function getProjectRoot(): string {
  return process.env.EZDOC_PROJECT_ROOT ?? process.cwd();
}

/**
 * 加载用户配置。
 *
 * 通过 Turbopack resolveAlias 将 `@config` 解析到用户项目的 ezdoc.config.ts。
 * withEzdoc() 会自动设置此 alias。
 */
export async function loadConfig(): Promise<ResolvedEzdocConfig> {
  // @config 由 Turbopack resolveAlias 解析到用户项目的 ezdoc.config.ts
  // withEzdoc() 中设置: "@config" → "./ezdoc.config.ts"
  const mod = await import("@config");
  return mod.default;
}
