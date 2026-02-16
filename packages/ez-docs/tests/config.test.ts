import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// Re-create the schemas locally for testing (avoid process.exit in defineConfig)
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
  primaryColor: z.string().regex(hexColorRegex).optional(),
  accentColor: z.string().regex(hexColorRegex).optional(),
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
    message: 'deploy.target 包含 "server" 时，deploy.server 配置必填',
    path: ["deploy", "server"],
  },
);

// ─── 测试 ────────────────────────────────────────────────────

describe("ezdoc config schema", () => {
  const minimalConfig = {
    site: { title: "Test Site" },
  };

  it("应接受最小有效配置", () => {
    const result = ezdocSchema.safeParse(minimalConfig);
    expect(result.success).toBe(true);
  });

  it("应填充默认值", () => {
    const result = ezdocSchema.safeParse(minimalConfig);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.docs.dir).toBe("docs");
    expect(result.data.docs.nav).toBe("docs.json");
    expect(result.data.theme.defaultMode).toBe("system");
    expect(result.data.i18n.defaultLocale).toBe("zh");
    expect(result.data.deploy.target).toBe("github");
    expect(result.data.overrides.dir).toBe("overrides");
  });

  it("应拒绝缺少 site.title 的配置", () => {
    const result = ezdocSchema.safeParse({ site: {} });
    expect(result.success).toBe(false);
  });

  it("应拒绝空 site.title", () => {
    const result = ezdocSchema.safeParse({ site: { title: "" } });
    expect(result.success).toBe(false);
  });

  describe("site.url 校验", () => {
    it("应接受有效 URL", () => {
      const result = ezdocSchema.safeParse({
        site: { title: "Test", url: "https://example.com" },
      });
      expect(result.success).toBe(true);
    });

    it("应拒绝无效 URL", () => {
      const result = ezdocSchema.safeParse({
        site: { title: "Test", url: "not-a-url" },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("hexColorRegex 颜色校验", () => {
    it("应接受 3 位 hex (#fff)", () => {
      const result = ezdocSchema.safeParse({
        site: { title: "T" },
        theme: { primaryColor: "#fff" },
      });
      expect(result.success).toBe(true);
    });

    it("应接受 6 位 hex (#3b82f6)", () => {
      const result = ezdocSchema.safeParse({
        site: { title: "T" },
        theme: { primaryColor: "#3b82f6" },
      });
      expect(result.success).toBe(true);
    });

    it("应接受 8 位 hex (#3b82f6ff)", () => {
      const result = ezdocSchema.safeParse({
        site: { title: "T" },
        theme: { primaryColor: "#3b82f6ff" },
      });
      expect(result.success).toBe(true);
    });

    it("应拒绝 4 位 hex (#abcd)", () => {
      const result = ezdocSchema.safeParse({
        site: { title: "T" },
        theme: { primaryColor: "#abcd" },
      });
      expect(result.success).toBe(false);
    });

    it("应拒绝 5 位 hex (#abcde)", () => {
      const result = ezdocSchema.safeParse({
        site: { title: "T" },
        theme: { primaryColor: "#abcde" },
      });
      expect(result.success).toBe(false);
    });

    it("应拒绝 7 位 hex (#abcdef0)", () => {
      const result = ezdocSchema.safeParse({
        site: { title: "T" },
        theme: { primaryColor: "#abcdef0" },
      });
      expect(result.success).toBe(false);
    });

    it("应拒绝不带 # 的 hex (3b82f6)", () => {
      const result = ezdocSchema.safeParse({
        site: { title: "T" },
        theme: { primaryColor: "3b82f6" },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("i18n locales 校验", () => {
    it("应接受唯一的 locale codes", () => {
      const result = ezdocSchema.safeParse({
        site: { title: "T" },
        i18n: {
          locales: [
            { code: "zh", label: "中文" },
            { code: "en", label: "English" },
          ],
        },
      });
      expect(result.success).toBe(true);
    });

    it("应拒绝重复的 locale codes", () => {
      const result = ezdocSchema.safeParse({
        site: { title: "T" },
        i18n: {
          locales: [
            { code: "zh", label: "中文" },
            { code: "zh", label: "Chinese" },
          ],
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("deploy 交叉校验", () => {
    it("target=github 时不需要 server 配置", () => {
      const result = ezdocSchema.safeParse({
        site: { title: "T" },
        deploy: { target: "github" },
      });
      expect(result.success).toBe(true);
    });

    it("target=server 时必须有 server 配置", () => {
      const result = ezdocSchema.safeParse({
        site: { title: "T" },
        deploy: { target: "server" },
      });
      expect(result.success).toBe(false);
    });

    it("target=both 时必须有 server 配置", () => {
      const result = ezdocSchema.safeParse({
        site: { title: "T" },
        deploy: { target: "both" },
      });
      expect(result.success).toBe(false);
    });

    it("target=server 提供 server 配置时应通过", () => {
      const result = ezdocSchema.safeParse({
        site: { title: "T" },
        deploy: {
          target: "server",
          server: {
            host: "example.com",
            user: "deploy",
            path: "/var/www",
          },
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe("theme.defaultMode", () => {
    it("应接受 light", () => {
      const result = ezdocSchema.safeParse({
        site: { title: "T" },
        theme: { defaultMode: "light" },
      });
      expect(result.success).toBe(true);
    });

    it("应接受 dark", () => {
      const result = ezdocSchema.safeParse({
        site: { title: "T" },
        theme: { defaultMode: "dark" },
      });
      expect(result.success).toBe(true);
    });

    it("应拒绝无效 mode", () => {
      const result = ezdocSchema.safeParse({
        site: { title: "T" },
        theme: { defaultMode: "auto" },
      });
      expect(result.success).toBe(false);
    });
  });
});
