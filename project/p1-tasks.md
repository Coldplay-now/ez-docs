# P1 框架化 — 开发任务清单

> 基于 `p1-framework-evolution.md` 规划文档，拆解为可执行的开发任务。
> 每个任务标注：编号、所属阶段、依赖关系、涉及文件、验收条件。

---

## 依赖关系总览

```
T01 安装 zod ─────────────────────────────────────────────────────────────┐
  │                                                                       │
T02 config schema ────┐                                                   │
  │                    │                                                   │
T03 docs.json schema ─┤                                                   │
  │                    │                                                   │
T04 校验错误格式化 ───┘                                                   │
  │                                                                       │
  ├──→ T05 config 类型重构 ──→ T06 overrides 配置段                       │
  │                                │                                      │
  │                    T07 路径别名 ┤                                      │
  │                                │                                      │
  │                    T08 组件注册表 ──→ T09 mdx-components 接入          │
  │                                │                                      │
  │                    T10 layout 覆盖 ──→ T11 覆盖机制验证               │
  │                                                                       │
  ├──→ T12 CLI 骨架 ──→ T13 ezdoc dev                                    │
  │         │                                                             │
  │         ├──→ T14 ezdoc build ─────────────────────────────────────────┤
  │         │         │                                                   │
  │         │         ├──→ T15 构建报告                                   │
  │         │         │                                                   │
  │         ├──→ T16 ezdoc new                                           │
  │         │                                                             │
  │         ├──→ T17 ezdoc check                                         │
  │         │                                                             │
  │         └──→ T18 ezdoc init-deploy ──→ T19 GitHub Actions 模板       │
  │                                    ──→ T20 Server 部署模板            │
  │                                                                       │
  │    (T21/T22 create-ezdoc 推迟到 P2)                                   │
  │                                                                       │
  └──→ T23 ezdoc deploy ──→ T24 GitHub Pages 部署                        │
                        ──→ T25 Server rsync 部署                         │
                                                                          │
T26 集成测试 ←────────────────────────────────────────────────────────────┘
T27 文档更新
```

---

## Phase 1A：配置校验与类型安全

### T01 — 安装 zod 依赖

| 属性 | 值 |
|------|-----|
| 阶段 | 1A |
| 依赖 | 无 |
| 文件 | `package.json` |

**内容：**
- `pnpm add zod`
- zod 是运行时 schema 校验库，约 50KB，无额外依赖

**验收：** `pnpm install` 成功，`import { z } from "zod"` 可用。

---

### T02 — ezdoc.config.ts 的 Zod schema

| 属性 | 值 |
|------|-----|
| 阶段 | 1A |
| 依赖 | T01 |
| 文件 | `src/lib/config.ts` |

**内容：**

用 Zod 定义完整的 EzdocConfig schema，替代当前的手写 TypeScript interface + 手动 merge defaults。

需要定义的 schema 段：

| 配置段 | 字段 | 校验规则 |
|--------|------|----------|
| `site` | `title` | `z.string().min(1)` — 必填 |
| `site` | `url` | `z.string().url().optional()` — 合法 URL |
| `site` | `socials` | `z.record(z.string().url())` — 每个值是合法 URL |
| `docs` | `dir` | `z.string().default("docs")` |
| `docs` | `nav` | `z.string().default("docs.json")` |
| `theme` | `defaultMode` | `z.enum(["light","dark","system"])` |
| `theme` | `primaryColor` | `z.string().regex(/^#[0-9a-f]{3,8}$/i).optional()` — 合法 hex |
| `i18n` | `defaultLocale` | `z.string().min(1)` |
| `i18n` | `locales` | `z.array(localeSchema).min(1)` — 至少一个 |
| `deploy` | `target` | `z.enum(["github","server","both"])` |
| `deploy` | `basePath` | `z.string()` — 必须以 `/` 开头或为空 |
| `deploy.server` | `host`, `user`, `path` | 当 target 含 server 时必填 |

**关键改动：**

```typescript
// 当前
export function defineConfig(config: EzdocConfig): Required<EzdocConfig> {
  return { ...defaults.site, ...config.site, ... };
}

// 改为
export function defineConfig(raw: EzdocConfig): Required<EzdocConfig> {
  const result = ezdocSchema.safeParse(raw);
  if (!result.success) {
    formatValidationErrors(result.error);  // → T04
    process.exit(1);
  }
  return result.data as Required<EzdocConfig>;
}
```

**注意：** `defineConfig` 的参数类型保持 `EzdocConfig`（TypeScript 类型），Zod 在运行时额外校验。这样用户的 IDE 提示不受影响。TypeScript interface 从 Zod schema 用 `z.infer<>` 推导，不再手写。

**验收：**
- 合法配置：`defineConfig` 正常返回，行为不变
- `site.title` 留空：终端输出 `site.title: 不能为空`
- `site.url` 写成非 URL：终端输出 `site.url: 不是合法的 URL`
- `deploy.target: "server"` 但不填 `server.host`：终端输出提示

---

### T03 — docs.json 的 Zod schema

| 属性 | 值 |
|------|-----|
| 阶段 | 1A |
| 依赖 | T01 |
| 文件 | `src/lib/docs.ts` |

**内容：**

在 `parseNavFile()` 中增加 Zod 校验。当前该函数只做 `JSON.parse`，不校验结构。

schema 定义：

```typescript
const navPageSchema: z.ZodType = z.union([
  z.string(),                                          // "getting-started"
  z.object({ title: z.string(), path: z.string() }),   // { title, path }
  z.object({                                            // { group, pages }
    group: z.string(),
    pages: z.lazy(() => z.array(navPageSchema)),
  }),
]);

const docsJsonSchema = z.object({
  navigation: z.array(z.object({
    group: z.string(),
    pages: z.array(navPageSchema),
  })),
});
```

**关键改动：**

```typescript
function parseNavFile(navFile: string, locale: string): NavGroup[] {
  const raw = fs.readFileSync(navFile, "utf-8");
  let json: unknown;
  try { json = JSON.parse(raw); } catch { ... }

  // 新增：schema 校验
  const result = docsJsonSchema.safeParse(json);
  if (!result.success) {
    console.error(`[ezdoc] ${navFile} 格式错误:`);
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    return [];
  }

  return result.data.navigation.map((group) => parseNavGroup(group, locale));
}
```

**额外校验（非 schema，逻辑层）：**
- 检查每个 `path` 对应的 `.md/.mdx` 文件是否存在，不存在则 warn
- 检查是否有重复的 `path`

**验收：**
- 合法 docs.json：正常解析
- `pages` 中出现数字 `123`：输出 `navigation.0.pages.0: 期望 string 或 {title,path} 或 {group,pages}`
- 嵌套 group 缺少 `pages` 字段：输出路径级错误提示
- 引用不存在的文件 path：warn 但不阻塞构建

---

### T04 — 校验错误格式化

| 属性 | 值 |
|------|-----|
| 阶段 | 1A |
| 依赖 | T02, T03 |
| 文件 | `src/lib/config.ts`（或新建 `src/lib/errors.ts`） |

**内容：**

统一的错误格式化函数，将 Zod error 转为用户友好的终端输出。

```
[ezdoc] ezdoc.config.ts 配置校验失败:

  ✗ site.title — 不能为空
  ✗ site.url — 不是合法的 URL，收到 "not-a-url"
  ✗ deploy.server.host — target 包含 "server" 时必填

  共 3 个错误。请修复后重试。
```

**设计要点：**
- 输出使用 ANSI 颜色（`\x1b[31m` 红色错误，`\x1b[90m` 灰色路径）
- 区分 error（阻塞）和 warn（继续）
- 提供修复建议（如 `site.url` 错误时提示 "格式如 https://example.com"）

**验收：** 错误信息在终端中可读、有颜色区分、包含字段路径。

---

### T05 — config 类型重构：从手写 interface 迁移到 z.infer

| 属性 | 值 |
|------|-----|
| 阶段 | 1A |
| 依赖 | T02 |
| 文件 | `src/lib/config.ts` |

**内容：**

当前 `config.ts` 有 8 个手写 interface（`SiteConfig`, `DocsConfig`, `ThemeConfig`, ...）。迁移为从 Zod schema 推导：

```typescript
// 删除所有手写 interface
// 改为：
export type EzdocConfig = z.infer<typeof ezdocSchema>;
export type SiteConfig = z.infer<typeof siteSchema>;
export type LocaleEntry = z.infer<typeof localeSchema>;
// ...
```

**注意：** `LocaleEntry` 被多个组件导入（`header.tsx`, `home-content.tsx` 等），导出名不能变。

**验收：** 所有现有导入保持兼容，`pnpm build` 通过。

---

## Phase 1B：组件覆盖机制

### T06 — config 新增 overrides 配置段

| 属性 | 值 |
|------|-----|
| 阶段 | 1B |
| 依赖 | T05 |
| 文件 | `src/lib/config.ts` |

**内容：**

在 Zod schema 中新增 `overrides` 段，定义用户覆盖组件的目录路径：

```typescript
overrides: z.object({
  dir: z.string().default("overrides"),
}).optional(),
```

`overrides.dir` 默认值 `"overrides"`，用户可改为其他路径。

**验收：** `ezdoc.config.ts` 中可以配置 `overrides: { dir: "my-components" }`。

---

### T07 — tsconfig 新增 @overrides 路径别名

| 属性 | 值 |
|------|-----|
| 阶段 | 1B |
| 依赖 | T06 |
| 文件 | `tsconfig.json` |

**内容：**

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@config": ["./ezdoc.config.ts"],
      "@overrides/*": ["./overrides/*"]     // ← 新增
    }
  }
}
```

同时创建空的 `overrides/` 目录和 `.gitkeep`，让路径别名不报错。

**验收：** `import Foo from "@overrides/mdx/callout"` 在 TypeScript 中能解析（文件存在时）。

---

### T08 — 组件注册表

| 属性 | 值 |
|------|-----|
| 阶段 | 1B |
| 依赖 | T07 |
| 文件 | `src/lib/component-registry.ts`（新建） |

**内容：**

组件注册表，管理所有可覆盖的 MDX 组件。核心设计：

```typescript
// 可覆盖组件清单及其导出映射
const COMPONENT_REGISTRY = {
  callout:   { exports: ["Callout"] },
  tabs:      { exports: ["Tabs", "TabItem"] },
  steps:     { exports: ["Steps", "Step"] },
  card:      { exports: ["Card", "CardGroup"] },
  accordion: { exports: ["Accordion", "AccordionItem"] },
  "file-tree": { exports: ["FileTree"] },
  badge:     { exports: ["Badge"] },
  video:     { exports: ["Video"] },
  "image-zoom": { exports: ["ImageZoom"] },
  tooltip:   { exports: ["Tooltip"] },
  "code-group": { exports: ["CodeGroup"] },
  "code-pre": { exports: ["CodePre"] },
  mermaid:   { exports: ["Mermaid"] },
} as const;
```

**覆盖解析逻辑：**

由于 Next.js App Router 不支持运行时 `require()`（服务端组件是 RSC），覆盖机制需要在构建时解析。

方案：**利用 Turbopack 的 `resolveAlias` 别名解析（已确认使用 Turbopack，不用 webpack）。** 在 `next.config.ts` 中动态配置：

```typescript
// next.config.ts
import fs from "fs";
import path from "path";

const overridesDir = path.join(process.cwd(), ezdocConfig.overrides?.dir ?? "overrides");

// 构建 Turbopack resolveAlias 映射
const resolveAlias: Record<string, string> = {};
for (const [name] of Object.entries(COMPONENT_REGISTRY)) {
  const overridePath = path.join(overridesDir, "mdx", name);
  if (fs.existsSync(overridePath + ".tsx") || fs.existsSync(overridePath + ".ts")) {
    resolveAlias[`@/components/mdx/${name}`] = overridePath;
  }
}

const nextConfig: NextConfig = {
  // ...
  experimental: {
    turbo: {
      resolveAlias,
    },
  },
};
```

这样 `mdx-components.tsx` 中的 `import { Callout } from "./callout"` 会被 Turbopack 替换为用户的文件，**不需要改 mdx-components.tsx 的代码。**

**验收：**
- 无 overrides 目录：所有组件使用框架默认
- 创建 `overrides/mdx/callout.tsx` 导出自定义 `Callout`：页面中的 Callout 使用用户版本
- 注册表中未列出的组件不可覆盖

---

### T09 — mdx-components.tsx 适配

| 属性 | 值 |
|------|-----|
| 阶段 | 1B |
| 依赖 | T08 |
| 文件 | `src/components/mdx/mdx-components.tsx` |

**内容：**

如果 T08 采用 Turbopack resolveAlias 方案，mdx-components.tsx **不需要改动**。现有的 `import { Callout } from "./callout"` 在有覆盖时会被 Turbopack 重定向。

但需要确保：
- 每个 MDX 组件文件导出的组件名和 props 类型有文档
- 用户覆盖时能知道 props 接口

增加导出 props 类型：

```typescript
// src/components/mdx/callout.tsx
export interface CalloutProps {
  type?: "info" | "warning" | "error" | "tip";
  title?: string;
  children: React.ReactNode;
}
export function Callout({ type, title, children }: CalloutProps) { ... }
```

对所有 14 个 MDX 组件，确保 props interface 是 `export` 的。

**验收：** 用户可以 `import type { CalloutProps } from "ezdoc"` 获取类型提示。

---

### T10 — Layout 组件覆盖

| 属性 | 值 |
|------|-----|
| 阶段 | 1B |
| 依赖 | T08 |
| 文件 | `next.config.ts`、layout 相关组件 |

**内容：**

将覆盖机制扩展到 layout 组件。可覆盖的 layout 组件：

| 组件 | 文件 | 接收 props |
|------|------|-----------|
| Header | `components/layout/header.tsx` | siteTitle, githubUrl, locale, locales, navigation, ... |
| Sidebar | `components/layout/sidebar.tsx` | navigation, currentSlug, locale, ... |
| TOC | `components/layout/toc.tsx` | toc: TocItem[] |
| Breadcrumb | `components/layout/breadcrumb.tsx` | items: BreadcrumbItem[] |
| DocPagination | `components/layout/doc-pagination.tsx` | prev, next, locale |
| Footer | `components/layout/footer.tsx` | 新建，默认空实现 |

Turbopack resolveAlias 方式同 T08，在 `next.config.ts` 中检查 `overrides/layout/` 目录。

需要新建 `src/components/layout/footer.tsx` — 默认空实现（`return null`），用户可覆盖添加自定义页脚。

**验收：**
- 创建 `overrides/layout/footer.tsx` 导出自定义 Footer → 页面底部出现自定义内容
- 创建 `overrides/layout/header.tsx` → Header 被替换

---

### T11 — 覆盖机制端到端验证

| 属性 | 值 |
|------|-----|
| 阶段 | 1B |
| 依赖 | T09, T10 |
| 文件 | `overrides/` 示例文件 |

**内容：**

创建示例覆盖文件验证整个流程：

1. `overrides/mdx/callout.tsx` — 自定义 Callout（改颜色/图标）
2. `overrides/layout/footer.tsx` — 添加 "Powered by ezdoc" 页脚

流程验证：
- `pnpm dev` — 开发模式下覆盖生效
- `pnpm build` — 构建成功，覆盖烘焙到静态 HTML
- 删除覆盖文件 → 回退到框架默认

验证后删除示例文件，保留 `overrides/.gitkeep`。

**验收：** 覆盖的完整生命周期可工作（添加→生效→删除→回退）。

---

## Phase 1C：CLI 工具

### T12 — CLI 骨架

| 属性 | 值 |
|------|-----|
| 阶段 | 1C |
| 依赖 | T02（CLI 需要调用配置校验） |
| 文件 | `cli/index.ts`, `package.json` |

**内容：**

CLI 入口，基于 Node.js 原生 `parseArgs`（Node 18.3+，无需第三方库）：

```typescript
#!/usr/bin/env node

import { parseArgs } from "node:util";

const commands = {
  dev: () => import("./dev"),
  build: () => import("./build"),
  new: () => import("./new-page"),
  check: () => import("./check"),
  deploy: () => import("./deploy"),
  "init-deploy": () => import("./init-deploy"),
};

const command = process.argv[2];
if (!command || !(command in commands)) {
  printUsage();
  process.exit(1);
}
commands[command]();
```

`package.json` 新增：

```json
{
  "bin": {
    "ezdoc": "./cli/index.ts"
  },
  "scripts": {
    "ezdoc": "tsx cli/index.ts"
  }
}
```

需要安装 `tsx` 作为 dev 依赖（执行 TypeScript CLI）。

**验收：** `pnpm ezdoc --help` 输出命令列表。

---

### T13 — ezdoc dev

| 属性 | 值 |
|------|-----|
| 阶段 | 1C |
| 依赖 | T12 |
| 文件 | `cli/dev.ts` |

**内容：**

```typescript
import { execSync } from "child_process";
import { validateConfig } from "../src/lib/config";

export default function dev() {
  validateConfig();  // 启动前校验配置
  execSync("next dev", { stdio: "inherit" });
}
```

本质是 `next dev` 的薄包装，但在启动前运行配置校验。

**验收：** `pnpm ezdoc dev` 启动开发服务器，配置有误时在启动前报错。

---

### T14 — ezdoc build

| 属性 | 值 |
|------|-----|
| 阶段 | 1C / 1D |
| 依赖 | T12, T03 |
| 文件 | `cli/build.ts` |

**内容：**

统一构建流程：

```typescript
export default async function build() {
  const startTime = Date.now();

  // 1. 校验 ezdoc.config.ts
  const config = validateConfig();

  // 2. 校验所有 locale 的 docs.json
  for (const locale of config.i18n.locales) {
    validateDocsJson(locale.code);
  }

  // 3. next build
  execSync("next build", { stdio: "inherit" });

  // 4. pagefind
  const outputDir = config.deploy.output ?? "out";
  execSync(`pagefind --site ${outputDir}`, { stdio: "inherit" });

  // 5. 构建报告 → T15
  printBuildReport(outputDir, startTime);
}
```

**验收：** `pnpm ezdoc build` 完成所有构建步骤，配置/导航有误时在构建前报错。

---

### T15 — 构建报告

| 属性 | 值 |
|------|-----|
| 阶段 | 1D |
| 依赖 | T14 |
| 文件 | `cli/build.ts`（内嵌） |

**内容：**

构建结束后输出摘要：

```
┌──────────────────────────────────────────────┐
│  ezdoc build 完成                             │
│                                              │
│  页面数:     22                               │
│  语言:       zh, en                           │
│  输出目录:   out/ (3.2 MB)                    │
│  构建耗时:   4.8s                             │
│                                              │
│  部署目标:   github (basePath: /ezdoc)        │
│  就绪:       out/ → 可直接部署               │
└──────────────────────────────────────────────┘
```

实现：扫描 `out/` 目录统计 `.html` 文件数和总大小。

**验收：** 构建成功后终端输出上述格式的报告。

---

### T16 — ezdoc new

| 属性 | 值 |
|------|-----|
| 阶段 | 1C |
| 依赖 | T12 |
| 文件 | `cli/new-page.ts` |

**内容：**

快速创建新文档页：

```bash
pnpm ezdoc new guide/advanced-config
```

行为：
1. 读取 ezdoc.config 确定 docs 目录和所有 locale
2. 对每个 locale 创建 `docs/{locale}/guide/advanced-config.mdx`
3. 填充 frontmatter 模板：

```yaml
---
title: advanced-config
description: ""
---

# advanced-config
```

4. 输出提示："已创建 2 个文件，请手动更新 docs.json 添加导航条目"

**验收：** 命令创建文件成功，frontmatter 格式正确。

---

### T17 — ezdoc check

| 属性 | 值 |
|------|-----|
| 阶段 | 1C |
| 依赖 | T12, T02, T03 |
| 文件 | `cli/check.ts` |

**内容：**

项目健康检查，不构建只校验：

```
pnpm ezdoc check
```

检查项：

| 检查 | 类型 | 说明 |
|------|------|------|
| 配置合法性 | error | Zod schema 校验 |
| docs.json 合法性 | error | 所有 locale 的导航配置 |
| 文件存在性 | warn | docs.json 中引用的 path 是否有对应 .md/.mdx |
| 重复路径 | warn | docs.json 中是否有重复的 path |
| 缺失翻译 | info | 默认 locale 有但其他 locale 缺失的页面 |
| 孤儿页面 | info | 存在 .md/.mdx 文件但未被 docs.json 引用 |

输出格式：

```
[ezdoc] 检查项目...

  ✓ ezdoc.config.ts 配置合法
  ✓ docs/zh/docs.json 格式正确
  ✓ docs/en/docs.json 格式正确
  ⚠ docs/en: 缺少 guide/configuration 的翻译
  ⚠ docs/en: 缺少 guide/docs-structure 的翻译
  ℹ docs/zh/components.mdx 未被导航引用

  2 warnings, 1 info
```

**验收：** 输出所有检查结果，exit code 在有 error 时为 1，只有 warn/info 时为 0。

---

### T18 — ezdoc init-deploy 骨架

| 属性 | 值 |
|------|-----|
| 阶段 | 1C |
| 依赖 | T12 |
| 文件 | `cli/init-deploy.ts` |

**内容：**

交互式初始化部署配置：

```bash
pnpm ezdoc init-deploy github   # 或 server
```

行为：
1. 读取 `deploy.target`
2. 根据目标生成对应的 CI 配置文件（T19/T20）
3. 提示用户后续步骤

**验收：** 命令能根据参数分发到 GitHub / Server 模板生成。

---

### T19 — GitHub Actions 工作流模板

| 属性 | 值 |
|------|-----|
| 阶段 | 1C |
| 依赖 | T18 |
| 文件 | `cli/templates/github-deploy.yml`（模板）、`cli/init-deploy.ts` |

**内容：**

生成 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
    paths:
      - 'docs/**'
      - 'ezdoc.config.ts'
      - 'package.json'

permissions:
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm ezdoc build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: out

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

模板中 `path: out` 根据 `deploy.output` 动态替换。

**验收：** 生成的 workflow 文件能在 GitHub Actions 中正常运行。

---

### T20 — Server 部署工作流模板

| 属性 | 值 |
|------|-----|
| 阶段 | 1C |
| 依赖 | T18 |
| 文件 | `cli/templates/server-deploy.yml`（模板）、`cli/init-deploy.ts` |

**内容：**

生成 `.github/workflows/deploy.yml`（rsync 版本）：

核心 step：

```yaml
- run: pnpm ezdoc build
- name: Deploy via rsync
  uses: burnett01/rsync-deployments@7
  with:
    switches: -avz --delete
    path: out/
    remote_path: ${{ secrets.DEPLOY_PATH }}
    remote_host: ${{ secrets.DEPLOY_HOST }}
    remote_user: ${{ secrets.DEPLOY_USER }}
    remote_key: ${{ secrets.SSH_PRIVATE_KEY }}
```

生成后提示用户：

```
请在 GitHub 仓库 Settings > Secrets 中设置：
  - DEPLOY_HOST: 服务器地址
  - DEPLOY_USER: SSH 用户名
  - DEPLOY_PATH: 部署路径
  - SSH_PRIVATE_KEY: SSH 私钥
```

**验收：** 生成的 workflow 文件结构正确，提示信息完整。

---

### ~~T21 — create-ezdoc 脚手架~~ （推迟到 P2）

| 属性 | 值 |
|------|-----|
| 阶段 | ~~1C~~ → **P2** |
| 依赖 | T12 |
| 文件 | `cli/create.ts`、`cli/templates/project/`（模板目录） |

**内容：**

```bash
npx create-ezdoc my-docs
# 或
pnpm ezdoc create my-docs
```

交互流程（使用 Node.js 原生 `readline`）：

```
✓ 项目名称: my-docs
? 站点标题: My Documentation
? 默认语言:
  > 中文 (zh)
    English (en)
? 部署目标:
  > GitHub Pages
    私有服务器
    两者都有

正在创建项目...
  ✓ 生成 ezdoc.config.ts
  ✓ 生成 docs/zh/getting-started.mdx
  ✓ 生成 docs/zh/docs.json
  ✓ 生成 package.json
  ✓ 安装依赖...

完成! 运行以下命令开始:
  cd my-docs
  pnpm dev
```

**验收：** 全流程可走通，生成的项目能 `pnpm dev` 启动。

---

### ~~T22 — 项目模板文件~~ （推迟到 P2）

| 属性 | 值 |
|------|-----|
| 阶段 | ~~1C~~ → **P2** |
| 依赖 | T21 |
| 文件 | `cli/templates/project/*` |

**内容：**

模板目录结构：

```
cli/templates/project/
├── ezdoc.config.ts.tpl       # 配置文件模板（变量替换）
├── package.json.tpl          # package.json 模板
├── docs/
│   └── __locale__/           # __locale__ 在创建时替换
│       ├── getting-started.mdx
│       └── docs.json
├── public/
│   └── favicon.ico
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
└── .gitignore
```

模板变量：`__TITLE__`, `__LOCALE__`, `__BASE_PATH__` 等，在 create 时替换。

**验收：** 模板文件内容合理，变量替换后是合法的代码文件。

---

## Phase 1D：部署功能

### T23 — ezdoc deploy 命令

| 属性 | 值 |
|------|-----|
| 阶段 | 1D |
| 依赖 | T14 |
| 文件 | `cli/deploy.ts` |

**内容：**

一键部署命令，根据 `deploy.target` 分发：

```typescript
export default async function deploy() {
  const config = validateConfig();
  const target = config.deploy.target;

  // 先构建
  await build();

  if (target === "github" || target === "both") {
    await deployGitHub(config);   // → T24
  }
  if (target === "server" || target === "both") {
    await deployServer(config);   // → T25
  }
}
```

**验收：** `pnpm ezdoc deploy` 自动构建并部署到配置的目标。

---

### T24 — GitHub Pages 部署实现

| 属性 | 值 |
|------|-----|
| 阶段 | 1D |
| 依赖 | T23 |
| 文件 | `cli/deploy.ts`（内嵌） |

**内容：**

本地直接推送到 `gh-pages` 分支：

```typescript
async function deployGitHub(config: EzdocConfig) {
  const outputDir = config.deploy.output ?? "out";

  // 检查 git 状态
  const remote = execSync("git remote get-url origin", { encoding: "utf-8" }).trim();
  if (!remote) throw new Error("未找到 git remote，请先初始化 git 仓库");

  // 使用 git worktree 推送到 gh-pages
  execSync(`git worktree add --detach /tmp/ezdoc-deploy`, { stdio: "pipe" });
  execSync(`cd /tmp/ezdoc-deploy && git checkout --orphan gh-pages`, { stdio: "pipe" });
  // 复制 out/ 内容并推送
  // ...

  console.log(`✓ 已部署到 GitHub Pages`);
}
```

或更简单：使用 `gh-pages` npm 包。

**验收：** `pnpm ezdoc deploy`（target=github）将 out/ 推送到 gh-pages 分支。

---

### T25 — Server rsync 部署实现

| 属性 | 值 |
|------|-----|
| 阶段 | 1D |
| 依赖 | T23 |
| 文件 | `cli/deploy.ts`（内嵌） |

**内容：**

```typescript
async function deployServer(config: EzdocConfig) {
  const { host, user, path: remotePath, port } = config.deploy.server!;
  const outputDir = config.deploy.output ?? "out";
  const portFlag = port && port !== 22 ? `-e 'ssh -p ${port}'` : "";

  // 检查 SSH 连接
  try {
    execSync(`ssh -o ConnectTimeout=5 ${user}@${host} echo ok`, { stdio: "pipe" });
  } catch {
    throw new Error(`无法连接到 ${user}@${host}，请检查 SSH 配置`);
  }

  // rsync
  execSync(
    `rsync -avz --delete ${portFlag} ${outputDir}/ ${user}@${host}:${remotePath}/`,
    { stdio: "inherit" },
  );

  console.log(`✓ 已部署到 ${host}:${remotePath}`);
}
```

**校验：**
- `deploy.server` 字段完整性（host, user, path 必填）
- SSH 连通性检查
- rsync 是否安装

**验收：** `pnpm ezdoc deploy`（target=server）将 out/ rsync 到远程服务器。

---

## 收尾

### T26 — 集成测试

| 属性 | 值 |
|------|-----|
| 阶段 | 收尾 |
| 依赖 | 所有任务 |
| 文件 | 无新文件（手动测试流程） |

**内容：**

端到端验证清单：

| # | 测试场景 | 预期 |
|---|----------|------|
| 1 | `ezdoc.config.ts` 删除 `site.title` | 终端报错 "site.title 不能为空"，exit 1 |
| 2 | `docs.json` 中 `pages` 包含数字 | 终端报错具体路径，exit 1 |
| 3 | `docs.json` 引用不存在的文件 | warn 但构建继续 |
| 4 | 创建 `overrides/mdx/callout.tsx` | 页面使用自定义 Callout |
| 5 | 删除 override 文件 | 回退到默认 Callout |
| 6 | 创建 `overrides/layout/footer.tsx` | 页面底部出现自定义内容 |
| 7 | `pnpm ezdoc dev` | 启动成功，配置校验通过 |
| 8 | `pnpm ezdoc build` | 构建成功，输出报告 |
| 9 | `pnpm ezdoc check` | 输出检查结果，缺失翻译标记为 warn |
| 10 | `pnpm ezdoc new guide/test-page` | 创建文件成功 |
| 11 | `pnpm ezdoc init-deploy github` | 生成 workflow 文件 |
| 12 | `pnpm ezdoc deploy` (github) | 推送 gh-pages 分支 |
| 13 | `pnpm ezdoc deploy` (server) | rsync 到服务器 |
| 14 | `pnpm ezdoc create test-project` | 生成新项目，可启动 |

**验收：** 所有 14 个场景通过。

---

### T27 — 文档更新

| 属性 | 值 |
|------|-----|
| 阶段 | 收尾 |
| 依赖 | T26 |
| 文件 | `docs/zh/` 下新增/更新文档 |

**内容：**

更新 ezdoc 自身文档，覆盖 P1 新增能力：

| 文档 | 内容 |
|------|------|
| `guide/configuration.mdx` | 更新配置说明，补充校验错误示例 |
| `guide/component-overrides.mdx` | 新建 — 组件覆盖指南 |
| `guide/cli.mdx` | 新建 — CLI 命令参考 |
| `guide/deployment.mdx` | 更新 — 新增 `ezdoc deploy` 和 `init-deploy` 说明 |
| `docs.json` | 更新导航结构 |

**验收：** 文档覆盖所有新功能，构建通过。

---

## 任务统计

| 阶段 | 任务数 | 核心交付物 |
|------|--------|-----------|
| 1A 配置校验 | T01-T05 (5) | Zod schema、错误格式化、类型推导 |
| 1B 组件覆盖 | T06-T11 (6) | 注册表、Turbopack resolveAlias、layout 覆盖 |
| 1C CLI | T12-T20 (9) | 6 个命令（T21/T22 推迟到 P2） |
| 1D 部署 | T23-T25 (3) | deploy 命令 + GitHub/Server 实现 |
| 收尾 | T26-T27 (2) | 集成测试 + 文档 |
| **合计** | **25** | （T21/T22 推迟到 P2） |

## 建议实施路径

```
第一批（基础）:  T01 → T02 → T03 → T04 → T05
第二批（覆盖）:  T06 → T07 → T08 → T09 → T10 → T11
第三批（CLI）:   T12 → T13, T14, T16, T17 (可并行) → T15
第四批（部署）:  T18 → T19, T20 (并行) → T23 → T24, T25 (并行)
第五批（收尾）:  T26 → T27

> 注：T21/T22 (create-ezdoc 脚手架) 已推迟到 P2。
> 技术决策：组件覆盖使用 Turbopack resolveAlias（非 webpack）。
```
