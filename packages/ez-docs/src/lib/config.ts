import { z } from "zod";

// ─── Zod Schemas ─────────────────────────────────────────────

const localeSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
});

const siteSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  logo: z.string().optional(),
  favicon: z.string().optional(),
  url: z.string().url().optional(),
  socials: z.record(z.string(), z.string().url()).optional(),
});

const docsSchema = z.object({
  dir: z.string().default("docs"),
  nav: z.string().default("docs.json"),
}).default(() => ({ dir: "docs", nav: "docs.json" }));

const hexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const themeSchema = z.object({
  defaultMode: z.enum(["light", "dark", "system"]).default("system"),
  primaryColor: z.string().regex(hexColorRegex, "无效的十六进制颜色，格式如 #fff、#3b82f6 或 #3b82f6ff").optional(),
  accentColor: z.string().regex(hexColorRegex, "无效的十六进制颜色，格式如 #fff、#3b82f6 或 #3b82f6ff").optional(),
}).default(() => ({ defaultMode: "system" as const }));

const i18nSchema = z.object({
  defaultLocale: z.string().min(1).default("zh"),
  locales: z.array(localeSchema).min(1).default([{ code: "zh", label: "中文" }])
    .refine(
      (locales) => new Set(locales.map((l) => l.code)).size === locales.length,
      { message: "locales 中存在重复的 code" },
    ),
}).default(() => ({ defaultLocale: "zh", locales: [{ code: "zh", label: "中文" }] }));

const versionsSchema = z.object({
  current: z.string().optional(),
  list: z.array(z.string()).default([]),
}).default(() => ({ list: [] }));

const serverSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive().default(22),
  user: z.string().min(1).default("root"),
  path: z.string().min(1),
});

const overridesSchema = z.object({
  dir: z.string().default("overrides"),
}).default(() => ({ dir: "overrides" }));

const deploySchema = z.object({
  target: z.enum(["github", "server", "both"]).default("github"),
  basePath: z.string().default(""),
  output: z.string().default("out"),
  server: serverSchema.optional(),
}).default(() => ({ target: "github" as const, basePath: "", output: "out" }));

const ezdocSchema = z.object({
  site: siteSchema,
  docs: docsSchema,
  theme: themeSchema,
  i18n: i18nSchema,
  versions: versionsSchema,
  deploy: deploySchema,
  overrides: overridesSchema,
}).refine(
  (data) => {
    if (data.deploy.target === "server" || data.deploy.target === "both") {
      return data.deploy.server != null;
    }
    return true;
  },
  {
    message: "deploy.target 包含 \"server\" 时，deploy.server 配置必填",
    path: ["deploy", "server"],
  },
);

// ─── 从 Zod schema 推导的类型 ─────────────────────────────────

/** 用户传入的配置（部分可选） */
export type EzdocConfig = z.input<typeof ezdocSchema>;

/** 经过 Zod 校验 + 默认值填充后的完整配置 */
export type ResolvedEzdocConfig = z.output<typeof ezdocSchema>;

export type SiteConfig = z.infer<typeof siteSchema>;
export type DocsConfig = z.infer<typeof docsSchema>;
export type ThemeConfig = z.infer<typeof themeSchema>;
export type I18nConfig = z.infer<typeof i18nSchema>;
export type LocaleEntry = z.infer<typeof localeSchema>;
export type VersionsConfig = z.infer<typeof versionsSchema>;
export type ServerConfig = z.infer<typeof serverSchema>;
export type DeployConfig = z.infer<typeof deploySchema>;
export type OverridesConfig = z.infer<typeof overridesSchema>;

// ─── 错误格式化 ──────────────────────────────────────────────

const RED = "\x1b[31m";
const GRAY = "\x1b[90m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function formatValidationErrors(error: z.ZodError, source: string): void {
  console.error(`\n${RED}${BOLD}[ezdoc] ${source} 配置校验失败:${RESET}\n`);

  for (const issue of error.issues) {
    const path = issue.path.join(".");
    console.error(`  ${RED}✗${RESET} ${BOLD}${path}${RESET} — ${issue.message}`);
  }

  console.error(
    `\n  ${GRAY}共 ${error.issues.length} 个错误。请修复后重试。${RESET}\n`,
  );
}

// ─── defineConfig ─────────────────────────────────────────────

export function defineConfig(raw: EzdocConfig): ResolvedEzdocConfig {
  const result = ezdocSchema.safeParse(raw);
  if (!result.success) {
    formatValidationErrors(result.error, "ezdoc.config.ts");
    process.exit(1);
  }
  return result.data;
}

// ─── validateConfig（供 CLI 调用） ─────────────────────────────

export function validateConfig(raw: unknown): ResolvedEzdocConfig {
  const result = ezdocSchema.safeParse(raw);
  if (!result.success) {
    formatValidationErrors(result.error, "ezdoc.config.ts");
    process.exit(1);
  }
  return result.data;
}

export function getBasePath(): string {
  return process.env.EZDOC_BASE_PATH ?? "";
}
