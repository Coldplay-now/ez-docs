# P2 npm 包提取 — 开发任务清单

> 基于 `p2-npm-extraction.md` 规划文档，拆解为可执行的开发任务。
> 每个任务标注：编号、所属阶段、依赖关系、涉及文件、验收条件。

### 已确认决策

| # | 决策项 | 结论 |
|---|--------|------|
| D1 | npm 包名 | `ez-docs`（核心框架）、`create-ez-docs`（脚手架） |
| D2 | 路由注入 | **排除方案 C**（薄路由层），用户项目不得出现 `src/app/`，仅验证 A/B/D |
| D3 | dogfooding workspace | 目录命名为 `website/`（非 `docs/`），避免与文档内容目录混淆 |
| D4 | 仓库策略 | **新建仓库**，当前仓库归档 |

---

## 依赖关系总览

```
Phase 2A: Monorepo 拆分
──────────────────────────────────────────────────────────────────────

T01 初始化 pnpm workspace + turborepo
  │
T02 创建 packages/ezdoc 包结构 + 迁移框架代码
  │
T03 配置 packages/ezdoc/package.json（exports / bin / files）
  │
T04 改造项目根目录为 dogfooding 文档站
  │
T05 迁移测试到 monorepo 结构，确保通过
  │
  └── 里程碑 ✓  pnpm dev / build / test 行为与 P1 一致

Phase 2A-PoC: 技术验证（阻塞 2B）
──────────────────────────────────────────────────────────────────────

T06 PoC：App Router 路由注入方案验证
  │
T07 PoC：Turbopack resolveAlias 跨包验证
  │
  └── 里程碑 ✓  确定路由注入方案（A/B/D），确认覆盖机制可行

Phase 2B: 路径解耦
──────────────────────────────────────────────────────────────────────

T08 实现 withEzdoc() Next.js 插件                 ←── 依赖 T06, T07
  │
T09 配置加载链改造：@config 静态导入 → 动态加载    ←── 依赖 T08
  │       涉及 8 个文件
  │
T10 process.cwd() 收敛为 getProjectRoot()         ←── 依赖 T09
  │       涉及 3 个 lib 文件 + next.config.ts
  │
T11 CSS 主题动态注入（primaryColor → OKLch）       ←── 依赖 T08
  │
T12 config schema 扩展：search.provider 预留       ←── 依赖 T09
  │
T13 TypeScript 路径别名处理                        ←── 依赖 T08
  │       tsconfig.base.json + extends 机制
  │
T14 移除 gray-matter，统一 frontmatter 解析        ←── 依赖 T09
  │
T15 路由注入实现（基于 T06 PoC 结果）              ←── 依赖 T08
  │
  └── 里程碑 ✓  用户项目 pnpm dev / build 可用，组件覆盖生效

Phase 2C: 脚手架 + 发布
──────────────────────────────────────────────────────────────────────

T16 create-ez-docs 交互式脚手架                     ←── 依赖 T13, T15
  │
T17 项目模板文件                                    ←── 依赖 T16
  │
T18 npm 发布配置（files / publishConfig / prepublishOnly）
  │
T19 GitHub Actions 自动发布工作流                   ←── 依赖 T18
  │
T20 端到端验证                                      ←── 依赖所有
  │
T21 文档更新                                        ←── 依赖 T20
  │
  └── 里程碑 ✓  npx create-ez-docs my-docs 全流程可用，npm 发布就绪
```

---

## 当前耦合点清单（P2 需解除）

在开始任务前，先明确 P1 遗留的 5 个硬耦合点：

| # | 耦合点 | 当前实现 | 涉及文件数 | P2 目标 |
|---|--------|---------|-----------|---------|
| C1 | `@config` 静态导入 | `import ezdocConfig from "@config"` | 8 个 | 动态加载 |
| C2 | `process.cwd()` 路径 | 直接拼接用户项目路径 | 11 个文件 18 处 | 收敛为 `getProjectRoot()` |
| C3 | `next.config.ts` 硬编码 | 直接 import `./ezdoc.config` | 1 个 | `withEzdoc()` 插件 |
| C4 | `tsconfig.json` 别名 | `@config` → `./ezdoc.config.ts` | 1 个 | `extends` + 框架 base |
| C5 | CSS 变量硬编码 | OKLch 值写死在 `globals.css` | 1 个 | 构建时注入 |

`@config` 导入的 8 个文件：

```
src/lib/mdx.ts
src/lib/docs.ts
src/app/docs/[locale]/[...slug]/page.tsx
src/app/docs/[locale]/layout.tsx
src/app/page.tsx
src/app/sitemap.ts
src/app/robots.ts
src/app/layout.tsx
```

---

## Phase 2A：Monorepo 拆分

### T01 — 初始化 pnpm workspace + turborepo

| 属性 | 值 |
|------|-----|
| 阶段 | 2A |
| 依赖 | 无 |
| 文件 | `pnpm-workspace.yaml`, `turbo.json`, 根 `package.json` |

**内容：**

创建 monorepo 基础结构：

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
  - "website"
```

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "out/**", ".next/**"]
    },
    "dev": {
      "persistent": true
    },
    "test": {},
    "check": {}
  }
}
```

根 `package.json` 改为 workspace 根，不再是应用：

```json
{
  "name": "ez-docs-monorepo",
  "private": true,
  "scripts": {
    "dev": "turbo dev --filter=ez-docs-website",
    "build": "turbo build",
    "test": "turbo test"
  },
  "devDependencies": {
    "turbo": "^2"
  }
}
```

安装：`pnpm add -Dw turbo`

**验收：** `pnpm install` 成功，workspace 结构被 pnpm 识别。

---

### T02 — 创建 packages/ez-docs 包结构 + 迁移框架代码

| 属性 | 值 |
|------|-----|
| 阶段 | 2A |
| 依赖 | T01 |
| 文件 | `packages/ez-docs/` 全部 |

**内容：**

将框架代码从项目根移入 `packages/ez-docs/`：

| 源 | 目标 | 说明 |
|----|------|------|
| `src/app/` | `packages/ez-docs/src/app/` | 路由层 |
| `src/components/` | `packages/ez-docs/src/components/` | 组件层 |
| `src/lib/` | `packages/ez-docs/src/lib/` | 引擎层 |
| `src/app/globals.css` | `packages/ez-docs/src/styles/globals.css` | 样式 |
| `cli/` | `packages/ez-docs/cli/` | CLI 工具 |

需要迁移的文件清单（按目录）：

**src/lib/**（8 个文件，853 行）：
- `config.ts` (147), `docs.ts` (367), `mdx.ts` (148), `nav-types.ts` (49)
- `component-registry.ts` (69), `file-scanner.ts` (26), `lang-labels.ts` (41), `utils.ts` (6)

**src/app/**（10 个文件，395 行）：
- `layout.tsx` (61), `page.tsx` (41), `not-found.tsx` (28)
- `robots.ts` (16), `sitemap.ts` (25), `globals.css` (253)
- `docs/layout.tsx` (7), `docs/page.tsx` (14)
- `docs/[locale]/layout.tsx` (44), `docs/[locale]/page.tsx` (22)
- `docs/[locale]/[...slug]/page.tsx` (137)

**src/components/**（3 个子目录，约 30 个文件）：
- `layout/` — header, sidebar, toc, breadcrumb, doc-pagination, footer
- `mdx/` — 14 个 MDX 组件 + index.ts + mdx-components.tsx
- `search/` — search-dialog, search-button

**cli/**（10 个文件，649 行）：
- `index.ts`, `bin.js`, `utils.ts`, `dev.ts`, `build.ts`
- `check.ts`, `deploy.ts`, `init-deploy.ts`, `new-page.ts`
- `read-deploy-config.ts`
- `templates/github-deploy.yml`, `templates/server-deploy.yml`

移动后更新所有内部 import 路径的相对引用。

**验收：** `packages/ez-docs/` 目录自包含，无对根目录 `src/` 的引用。TypeScript 编译无报错。

---

### T03 — 配置 packages/ez-docs/package.json

| 属性 | 值 |
|------|-----|
| 阶段 | 2A |
| 依赖 | T02 |
| 文件 | `packages/ez-docs/package.json` |

**内容：**

```json
{
  "name": "ez-docs",
  "version": "0.1.0",
  "description": "开箱即用的文档框架，基于 Next.js 16",
  "type": "module",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/Coldplay-now/ez-docs",
    "directory": "packages/ez-docs"
  },
  "bin": {
    "ezdoc": "./cli/bin.js"
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./next": {
      "types": "./dist/next.d.ts",
      "import": "./dist/next.js"
    },
    "./config": {
      "types": "./dist/lib/config.d.ts",
      "import": "./dist/lib/config.js"
    },
    "./components/*": {
      "types": "./dist/components/*.d.ts",
      "import": "./dist/components/*.js"
    },
    "./styles": "./src/styles/globals.css"
  },
  "files": [
    "dist/",
    "cli/",
    "src/styles/",
    "tsconfig.base.json"
  ],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run"
  },
  "peerDependencies": {
    "next": ">=15",
    "react": ">=19",
    "react-dom": ">=19"
  }
}
```

依赖分类决策：

| 类型 | 包 | 理由 |
|------|-----|------|
| **peerDependencies** | next, react, react-dom | 用户项目必须安装 |
| **dependencies** | next-mdx-remote, remark-*, rehype-*, shiki, zod, radix-ui, lucide-react, next-themes, tailwind-merge, clsx, class-variance-authority, katex, gray-matter | 框架内部依赖 |
| **optionalDependencies** | mermaid | 仅图表功能需要 |
| **devDependencies** | typescript, vitest, tsup, @types/* | 开发构建 |

安装 tsup 用于包构建：`pnpm add -D tsup --filter ez-docs`

**验收：** `pnpm pack --filter ez-docs` 生成正确 tarball，`exports` 路径都存在。

---

### T04 — 改造项目根目录为 dogfooding 文档站

| 属性 | 值 |
|------|-----|
| 阶段 | 2A |
| 依赖 | T02, T03 |
| 文件 | `website/package.json`, `website/next.config.ts`, `website/ezdoc.config.ts` |

**内容：**

将当前项目的用户侧文件移入 `website/` workspace（使用 `website/` 而非 `docs/`，避免与文档内容目录 `docs/` 混淆）：

| 源 | 目标 |
|----|------|
| `ezdoc.config.ts` | `website/ezdoc.config.ts` |
| `docs/zh/`, `docs/en/` | `website/docs/zh/`, `website/docs/en/` |
| `public/` | `website/public/` |
| `overrides/` | `website/overrides/` |

创建 `website/package.json`：

```json
{
  "name": "ez-docs-website",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "ezdoc dev",
    "build": "ezdoc build",
    "check": "ezdoc check"
  },
  "dependencies": {
    "ez-docs": "workspace:*"
  }
}
```

创建 `website/next.config.ts`（用户项目的标准写法）：

```typescript
import { withEzdoc } from "ez-docs/next";
export default withEzdoc({});
```

> 注意：此时 `withEzdoc()` 尚未实现（T08），本阶段先用临时兼容方案保持构建可用。
> 临时方案：`website/next.config.ts` 直接 import 框架的 next.config 逻辑。

**验收：** `cd website && pnpm dev` 启动的文档站与 P1 完全一致。

---

### T05 — 迁移测试到 monorepo 结构

| 属性 | 值 |
|------|-----|
| 阶段 | 2A |
| 依赖 | T02 |
| 文件 | `packages/ez-docs/tests/`, `packages/ez-docs/vitest.config.ts` |

**内容：**

将 `tests/` 目录移入 `packages/ez-docs/tests/`，更新 vitest 配置的路径别名：

```typescript
// packages/ez-docs/vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

当前 4 个测试文件（54 个测试）：
- `tests/config.test.ts` (22 tests)
- `tests/docs.test.ts` (17 tests)
- `tests/file-scanner.test.ts` (6 tests)
- `tests/component-registry.test.ts` (9 tests)

**验收：** `pnpm test --filter ez-docs` 全部 54 个测试通过。

---

### Phase 2A 里程碑验证

| # | 验证项 | 命令 |
|---|--------|------|
| 1 | monorepo 结构正确 | `pnpm install` 无报错 |
| 2 | 测试通过 | `pnpm test --filter ez-docs` — 54 tests pass |
| 3 | 文档站开发可用 | `cd website && pnpm dev` — 站点正常 |
| 4 | 文档站构建可用 | `cd website && pnpm build` — 33 页面生成 |
| 5 | CLI 命令可用 | `cd website && pnpm ezdoc check` — 通过 |

---

## Phase 2A-PoC：技术验证

> **阻塞 Phase 2B 全部任务。** 必须在 2A 完成后、2B 开始前完成验证。

### T06 — PoC：App Router 路由注入方案验证

| 属性 | 值 |
|------|-----|
| 阶段 | 2A-PoC |
| 依赖 | T04 |
| 文件 | 临时 PoC 项目（不进入主仓库） |

**内容：**

创建最小 Next.js 16 项目，验证框架路由从 node_modules 注入到用户项目的可行性。

> **决策 D2：** 方案 C（薄路由层）已排除 — 用户项目不得出现 `src/app/` 目录。仅验证 A/B/D 三种方案。

需要验证的 3 个方案：

**方案 A：符号链接（推荐优先尝试）**

```bash
# 用户项目中
ln -s ./node_modules/ez-docs/src/app ./src/app
# 或 CLI 自动创建：
# .ezdoc/app → node_modules/ez-docs/src/app
```

验证点：
- [ ] `next dev` 能识别符号链接的 `app/` 目录
- [ ] `next build && output: "export"` 静态生成正常
- [ ] `generateStaticParams` 能正确枚举
- [ ] 热更新（HMR）在符号链接下工作
- [ ] Windows 下 `mklink /D` 是否需要管理员权限

**方案 B：文件复制**

```bash
# CLI 启动时
cp -r node_modules/ez-docs/src/app .ezdoc/app
# .ezdoc/ 加入 .gitignore
```

验证点：
- [ ] 复制后的路由文件能正常工作
- [ ] import 路径在复制后是否正确（相对路径 vs 绝对路径）
- [ ] 包更新后重新复制是否会有缓存问题

~~**方案 C：薄路由层 — 已排除（决策 D2）**~~

> 用户明确要求项目中不得出现 `src/app/` 目录，此方案不予验证。

**方案 D：rootDir 重定向**

```typescript
// next.config.ts
const nextConfig = {
  // 是否有 API 让 Next.js 从非标准目录加载 app/?
  experimental: {
    appDir: "node_modules/ez-docs/src/app",  // 假设存在
  },
};
```

验证点：
- [ ] Next.js 16 是否支持 appDir 重定向
- [ ] 不支持的话是否有 workaround

**输出物：**

一份 PoC 报告，包含：
1. 每种方案的测试结果（通过/失败）
2. 失败方案的具体报错信息
3. 推荐方案及其 trade-off
4. 对后续任务的影响（特别是 T15 的实现方式）

**验收：** A/B/D 中至少一种方案验证通过，确定 T15 的实现路线。

---

### T07 — PoC：Turbopack resolveAlias 跨包验证

| 属性 | 值 |
|------|-----|
| 阶段 | 2A-PoC |
| 依赖 | T06（可并行） |
| 文件 | 临时 PoC 项目 |

**内容：**

在 T06 的 PoC 项目基础上，验证组件覆盖机制在 npm 包模式下是否工作。

核心问题：当框架代码在 `node_modules/ez-docs/` 中时，Turbopack 的 `resolveAlias` 能否将框架内部的 import 重定向到用户项目的文件？

```typescript
// 框架代码（在 node_modules/ez-docs/ 中）
import { Callout } from "@/components/mdx/callout";

// Turbopack alias 配置（在用户项目的 next.config.ts 中）
turbopack: {
  resolveAlias: {
    "@/components/mdx/callout": "/user-project/overrides/mdx/callout"
  }
}
```

验证点：
- [ ] alias 的 key 中 `@/` 是否相对于用户项目还是 node_modules
- [ ] 绝对路径的 alias value 是否被正确解析
- [ ] Server Components 中的 alias 是否生效
- [ ] 没有 alias 时是否回退到框架默认组件

**降级方案：** 如果 Turbopack alias 不支持跨包，降级为：
1. webpack alias（Next.js 仍支持 webpack 模式）
2. 或在 CLI 启动时将覆盖文件复制到框架包内部

**验收：** 确认组件覆盖在 npm 包模式下可行，或确定降级方案。

---

## Phase 2B：路径解耦

### T08 — 实现 withEzdoc() Next.js 插件

| 属性 | 值 |
|------|-----|
| 阶段 | 2B |
| 依赖 | T06, T07（PoC 结果） |
| 文件 | `packages/ez-docs/src/next.ts` |

**内容：**

封装框架对 Next.js 的全部配置要求为一个插件函数，取代当前的 `next.config.ts` 硬编码：

```typescript
// packages/ez-docs/src/next.ts
import type { NextConfig } from "next";
import path from "path";
import { buildResolveAlias } from "./lib/component-registry";
import { loadConfigSync } from "./lib/config-loader";

interface EzdocPluginOptions {
  /** 用户的额外 Next.js 配置 */
  nextConfig?: Partial<NextConfig>;
}

export function withEzdoc(options: EzdocPluginOptions = {}): NextConfig {
  const projectRoot = process.cwd();
  const config = loadConfigSync(projectRoot);

  const basePath = process.env.EZDOC_BASE_PATH ?? config.deploy.basePath;

  // 组件覆盖
  const overridesDir = path.join(projectRoot, config.overrides.dir);
  const resolveAlias = buildResolveAlias(overridesDir);
  const hasOverrides = Object.keys(resolveAlias).length > 0;

  if (hasOverrides) {
    console.log(`[ezdoc] 组件覆盖: ${Object.keys(resolveAlias).join(", ")}`);
  }

  // 路由注入配置（基于 T06 PoC 结果填充）
  const routeConfig = getRouteInjectionConfig(projectRoot);

  return {
    ...options.nextConfig,
    output: "export",
    basePath: basePath || undefined,
    trailingSlash: true,
    images: { unoptimized: true },
    env: {
      NEXT_PUBLIC_BASE_PATH: basePath || "",
      EZDOC_PROJECT_ROOT: projectRoot,
    },
    ...routeConfig,
    ...(hasOverrides && {
      turbopack: { resolveAlias },
    }),
  };
}
```

**验收：** 用户项目中 `import { withEzdoc } from "ez-docs/next"` 可用，`next dev` 和 `next build` 正常。

---

### T09 — 配置加载链改造：@config 静态导入 → 动态加载

| 属性 | 值 |
|------|-----|
| 阶段 | 2B |
| 依赖 | T08 |
| 文件 | 8 个文件（见耦合点 C1） |

**内容：**

当前 8 个文件通过 `import ezdocConfig from "@config"` 静态绑定用户配置。npm 包化后 `@config` 别名不可用。

**步骤 1：** 创建配置加载器

```typescript
// packages/ez-docs/src/lib/config-loader.ts
import path from "path";
import { ezdocSchema, formatValidationErrors } from "./config";
import type { ResolvedEzdocConfig } from "./config";

let _cache: ResolvedEzdocConfig | null = null;

/** 异步加载用户配置（供 lib/ 和 app/ 使用） */
export async function loadConfig(projectRoot?: string): Promise<ResolvedEzdocConfig> {
  if (_cache) return _cache;

  const root = projectRoot ?? process.env.EZDOC_PROJECT_ROOT ?? process.cwd();
  const configPath = path.join(root, "ezdoc.config.ts");

  const mod = await import(configPath);
  const raw = mod.default;

  const result = ezdocSchema.safeParse(raw);
  if (!result.success) {
    formatValidationErrors(result.error, "ezdoc.config.ts");
    process.exit(1);
  }

  _cache = result.data;
  return result.data;
}

/** 同步加载（供 next.config.ts 使用） */
export function loadConfigSync(projectRoot?: string): ResolvedEzdocConfig {
  const root = projectRoot ?? process.env.EZDOC_PROJECT_ROOT ?? process.cwd();
  // 同步加载方案取决于 Node.js 版本和构建工具
  // 选项 1：require() + tsx register
  // 选项 2：读文件 + 正则提取（降级）
  // 选项 3：环境变量传递序列化后的配置
}
```

**步骤 2：** 逐文件替换

| 文件 | 当前 | 改为 |
|------|------|------|
| `src/lib/docs.ts` | `import ezdocConfig from "@config"` | 函数参数传入 `config: ResolvedEzdocConfig` |
| `src/lib/mdx.ts` | 同上 | 同上 |
| `src/app/layout.tsx` | 同上 | `const config = await loadConfig()` |
| `src/app/page.tsx` | 同上 | 同上 |
| `src/app/robots.ts` | 同上 | 同上 |
| `src/app/sitemap.ts` | 同上 | 同上 |
| `src/app/docs/[locale]/layout.tsx` | 同上 | 同上 |
| `src/app/docs/[locale]/[...slug]/page.tsx` | 同上 | 同上 |

对 `docs.ts` 和 `mdx.ts`，改为函数参数注入配置，避免模块级副作用：

```typescript
// 改造前
import ezdocConfig from "@config";
function getDocsDir(locale: string): string {
  const dir = ezdocConfig.docs?.dir ?? "docs";
  return path.join(process.cwd(), dir, locale);
}

// 改造后
function getDocsDir(locale: string, config: ResolvedEzdocConfig): string {
  const dir = config.docs.dir;
  return path.join(getProjectRoot(), dir, locale);
}
```

**验收：** 删除 `tsconfig.json` 中的 `@config` 别名后，全部文件编译通过。所有测试通过。

---

### T10 — process.cwd() 收敛为 getProjectRoot()

| 属性 | 值 |
|------|-----|
| 阶段 | 2B |
| 依赖 | T09 |
| 文件 | `packages/ez-docs/src/lib/paths.ts`（新建）+ 11 个文件 |

**内容：**

当前 `process.cwd()` 使用位置（框架核心，不含 CLI）：

| 文件 | 行号 | 用途 |
|------|------|------|
| `src/lib/docs.ts` | 33 | `getDocsDir()` |
| `src/lib/mdx.ts` | 81, 132, 142 | `getDocBySlug()`, `getAllSlugs()` |
| `next.config.ts` | 9 | overrides 目录 |

创建路径工具模块：

```typescript
// packages/ez-docs/src/lib/paths.ts

/**
 * 获取用户项目根目录。
 *
 * 优先级：
 * 1. EZDOC_PROJECT_ROOT 环境变量（withEzdoc 设置）
 * 2. process.cwd()（默认，适用于直接运行场景）
 */
export function getProjectRoot(): string {
  return process.env.EZDOC_PROJECT_ROOT ?? process.cwd();
}
```

逐文件替换所有 `process.cwd()` → `getProjectRoot()`。

> CLI 文件中的 `process.cwd()` **不需要替换** — CLI 始终在用户项目目录中运行，`process.cwd()` 语义正确。

**验收：** 全局搜索 `process.cwd()`，仅在 `paths.ts` 和 `cli/` 目录中出现。

---

### T11 — CSS 主题动态注入

| 属性 | 值 |
|------|-----|
| 阶段 | 2B |
| 依赖 | T08 |
| 文件 | `packages/ez-docs/src/lib/theme.ts`（新建）、`src/app/layout.tsx` |

**内容：**

当前 `theme.primaryColor` 和 `theme.accentColor` 配置存在但未被使用。`globals.css` 中 OKLch 值硬编码。

**步骤 1：** hex → OKLch 转换工具

```typescript
// packages/ez-docs/src/lib/theme.ts

/** 将 hex 颜色转为 OKLch CSS 值 */
export function hexToOklch(hex: string): string {
  // hex → sRGB → linear RGB → OKLab → OKLch
  // 使用纯数学实现，不引入额外依赖
}

/** 生成主题 CSS 变量覆盖 */
export function generateThemeCSS(config: ResolvedEzdocConfig): string {
  const overrides: string[] = [];

  if (config.theme.primaryColor) {
    const oklch = hexToOklch(config.theme.primaryColor);
    overrides.push(`:root { --primary: ${oklch}; --sidebar-primary: ${oklch}; }`);
    // 深色模式：亮度 +0.1
    const darkOklch = adjustLightness(oklch, 0.1);
    overrides.push(`.dark { --primary: ${darkOklch}; --sidebar-primary: ${darkOklch}; }`);
  }

  if (config.theme.accentColor) {
    const oklch = hexToOklch(config.theme.accentColor);
    overrides.push(`:root { --accent: ${oklch}; }`);
  }

  return overrides.join("\n");
}
```

**步骤 2：** 在 layout.tsx 的 `<head>` 中注入

```tsx
// src/app/layout.tsx
const themeCSS = generateThemeCSS(config);

<head>
  {themeCSS && <style dangerouslySetInnerHTML={{ __html: themeCSS }} />}
</head>
```

**验收：**
- 设置 `primaryColor: "#10b981"` → 站点主色调变绿
- 不设置 primaryColor → 使用默认蓝色
- 深色模式下颜色自动适配

---

### T12 — config schema 扩展：search.provider 预留

| 属性 | 值 |
|------|-----|
| 阶段 | 2B |
| 依赖 | T09 |
| 文件 | `packages/ez-docs/src/lib/config.ts` |

**内容：**

为 P3 Algolia 集成预留配置字段，不实现功能：

```typescript
const algoliaSchema = z.object({
  appId: z.string().min(1),
  apiKey: z.string().min(1),
  indexName: z.string().min(1),
});

const searchSchema = z.object({
  provider: z.enum(["pagefind", "algolia"]).default("pagefind"),
  algolia: algoliaSchema.optional(),
}).default(() => ({ provider: "pagefind" as const }))
  .refine(
    (data) => data.provider !== "algolia" || data.algolia != null,
    { message: "search.provider 为 \"algolia\" 时，search.algolia 配置必填" },
  );
```

在 `ezdocSchema` 中新增 `search` 段。

**验收：** 配置中可写 `search: { provider: "pagefind" }` 或省略。schema 校验通过。设置 `provider: "algolia"` 但不填 algolia 配置时报错。

---

### T13 — TypeScript 路径别名处理

| 属性 | 值 |
|------|-----|
| 阶段 | 2B |
| 依赖 | T08 |
| 文件 | `packages/ez-docs/tsconfig.base.json`（新建）|

**内容：**

框架提供 base tsconfig，用户项目 extends 它：

```json
// packages/ez-docs/tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }]
  }
}
```

用户项目的 `tsconfig.json`（由 create-ezdoc 生成）：

```json
{
  "extends": "ez-docs/tsconfig.base.json",
  "compilerOptions": {
    "paths": {
      "@overrides/*": ["./overrides/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

> 注意：移除了 `@config` 别名（T09 已改为动态加载）和 `@/*` 别名（框架内部使用，不暴露给用户）。

**验收：** 用户项目 `tsc --noEmit` 无报错。override 组件有 IDE 类型提示。

---

### T14 — 移除 gray-matter，统一 frontmatter 解析

| 属性 | 值 |
|------|-----|
| 阶段 | 2B |
| 依赖 | T09 |
| 文件 | `packages/ez-docs/src/lib/docs.ts`, `package.json` |

**内容：**

当前 `docs.ts` 中 `readFrontmatter()` 使用 `gray-matter` 读取标题，而 `mdx.ts` 已通过 `next-mdx-remote` 的 `parseFrontmatter: true` 解析 frontmatter。两个库做了重复工作。

改造方案：

```typescript
// 当前（docs.ts:42-53）：使用 gray-matter
import matter from "gray-matter";
function readFrontmatter(filePath: string): Record<string, unknown> {
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data } = matter(raw);
  return data;
}

// 改为：手动提取 YAML frontmatter（仅需 title 字段用于导航显示）
function readFrontmatter(filePath: string): Record<string, unknown> {
  const raw = fs.readFileSync(filePath, "utf-8");
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const frontmatter: Record<string, unknown> = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (kv) {
      let value: string = kv[2].trim();
      // 去除引号
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      frontmatter[kv[1]] = value;
    }
  }
  return frontmatter;
}
```

或者更简洁的方案：保留 `gray-matter` 但列为 optional dependency，延迟 import。

> 推荐先用简单 YAML 提取，因为导航只需要 `title` 字段。如果后续需要复杂 frontmatter（嵌套对象、数组），再考虑引入轻量解析。

从 `dependencies` 中移除 `gray-matter`。

**验收：** `pnpm build` 通过。导航标题显示正确。`gray-matter` 不在 dependencies 中。

---

### T15 — 路由注入实现

| 属性 | 值 |
|------|-----|
| 阶段 | 2B |
| 依赖 | T08（+ T06 PoC 结果决定实现方式） |
| 文件 | 取决于 PoC 方案 |

**内容：**

根据 T06 PoC 确定的方案，实现框架路由到用户项目的注入。

**如果方案 A（符号链接）通过：**

```typescript
// packages/ez-docs/cli/prepare.ts
import fs from "fs";
import path from "path";

/**
 * 在用户项目中创建 .ezdoc/ 目录，符号链接框架路由。
 * 由 ezdoc dev / ezdoc build 自动调用。
 */
export function prepareProject(projectRoot: string): void {
  const ezdocDir = path.join(projectRoot, ".ezdoc");
  const frameworkAppDir = path.join(
    projectRoot, "node_modules", "ez-docs", "src", "app"
  );

  // 创建 .ezdoc/ 目录
  fs.mkdirSync(ezdocDir, { recursive: true });

  // 符号链接 app/
  const appLink = path.join(ezdocDir, "app");
  if (!fs.existsSync(appLink)) {
    fs.symlinkSync(frameworkAppDir, appLink, "dir");
  }

  // 确保 .gitignore 包含 .ezdoc/
  ensureGitignore(projectRoot, ".ezdoc/");
}
```

在 `cli/dev.ts` 和 `cli/build.ts` 中调用 `prepareProject()`。

Next.js 配置中指定 appDir：

```typescript
// withEzdoc() 中
const nextConfig = {
  // ... 其他配置
  distDir: ".next",
  // App Router 使用 .ezdoc/app 作为路由目录
};
```

~~**方案 C（薄路由层）— 已排除（决策 D2）**~~

> 用户项目不得出现 `src/app/` 目录，此方案不实现。

**如果方案 D（rootDir 重定向）通过：**

调整 Next.js 的 appDir/rootDir 指向框架包目录，用户项目保持干净。

**验收：** 用户项目中无框架源码副本，`next dev` 和 `next build` 正常。

---

### Phase 2B 里程碑验证

| # | 验证项 | 命令 |
|---|--------|------|
| 1 | 配置动态加载 | 删除 `@config` 别名，编译通过 |
| 2 | 路径收敛 | 全局搜 `process.cwd()`，仅在 `paths.ts` + `cli/` 中 |
| 3 | 主题注入 | 设置 `primaryColor: "#10b981"`，站点变绿 |
| 4 | 组件覆盖 | 创建 `overrides/mdx/callout.tsx`，覆盖生效 |
| 5 | 路由注入 | 用户项目无 `src/app/` 目录，功能完整 |
| 6 | dogfooding | `cd website && pnpm build` — 33 页面，双语完整 |
| 7 | 测试通过 | `pnpm test --filter ez-docs` — 全部通过 |

---

## Phase 2C：脚手架 + npm 发布

### T16 — create-ez-docs 交互式脚手架

| 属性 | 值 |
|------|-----|
| 阶段 | 2C |
| 依赖 | T13, T15 |
| 文件 | `packages/create-ez-docs/src/index.ts` |

**内容：**

使用 Node.js 原生 `readline`，不引入第三方交互库：

```typescript
#!/usr/bin/env node

import readline from "readline";
import fs from "fs";
import path from "path";

async function main() {
  const projectName = process.argv[2];
  if (!projectName) {
    console.error("用法: npx create-ez-docs <project-name>");
    process.exit(1);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string) => new Promise<string>((r) => rl.question(q, r));

  console.log("\n✨ 创建 ezdoc 文档项目\n");

  const title = await ask("站点标题: ");
  const locale = await choose(rl, "默认语言:", [
    { label: "中文 (zh)", value: "zh" },
    { label: "English (en)", value: "en" },
    { label: "中文 + English", value: "zh+en" },
  ]);
  const deployTarget = await choose(rl, "部署目标:", [
    { label: "GitHub Pages", value: "github" },
    { label: "私有服务器", value: "server" },
    { label: "两者都有", value: "both" },
  ]);

  rl.close();

  // 生成项目
  const targetDir = path.join(process.cwd(), projectName);
  await generateProject(targetDir, { title, locale, deployTarget });

  console.log(`\n✅ 项目已创建！运行以下命令开始：`);
  console.log(`   cd ${projectName}`);
  console.log(`   pnpm install`);
  console.log(`   pnpm dev\n`);
}
```

**验收：** `npx create-ez-docs test-project` 交互流程完整，生成项目能 `pnpm dev` 启动。

---

### T17 — 项目模板文件

| 属性 | 值 |
|------|-----|
| 阶段 | 2C |
| 依赖 | T16 |
| 文件 | `packages/create-ez-docs/templates/` |

**内容：**

```
packages/create-ez-docs/templates/
├── ezdoc.config.ts.tpl
├── next.config.ts.tpl
├── tsconfig.json.tpl
├── package.json.tpl
├── gitignore.tpl                  # 注意：不能叫 .gitignore（npm 发布会忽略）
├── docs/
│   └── __LOCALE__/
│       ├── getting-started.mdx
│       └── docs.json
└── public/
    └── favicon.ico
```

各模板内容：

```typescript
// ezdoc.config.ts.tpl
import { defineConfig } from "ez-docs/config";

export default defineConfig({
  site: {
    title: "__TITLE__",
  },
  i18n: {
    defaultLocale: "__DEFAULT_LOCALE__",
    locales: __LOCALES__,
  },
  deploy: {
    target: "__DEPLOY_TARGET__",
  },
});
```

```typescript
// next.config.ts.tpl
import { withEzdoc } from "ez-docs/next";
export default withEzdoc({});
```

```json
// package.json.tpl
{
  "name": "__PROJECT_NAME__",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "ezdoc dev",
    "build": "ezdoc build",
    "check": "ezdoc check"
  },
  "dependencies": {
    "ez-docs": "^0.1.0"
  }
}
```

模板变量替换表：

| 变量 | 来源 | 示例值 |
|------|------|--------|
| `__TITLE__` | 用户输入 | `"My Documentation"` |
| `__PROJECT_NAME__` | CLI 参数 | `"my-docs"` |
| `__DEFAULT_LOCALE__` | 用户选择 | `"zh"` |
| `__LOCALES__` | 用户选择 | `[{ code: "zh", label: "中文" }]` |
| `__DEPLOY_TARGET__` | 用户选择 | `"github"` |
| `__LOCALE__` | 目录名替换 | `zh`, `en` |

**验收：** 模板文件变量替换后是合法代码文件，TypeScript 编译通过。

---

### T18 — npm 发布配置

| 属性 | 值 |
|------|-----|
| 阶段 | 2C |
| 依赖 | T03 |
| 文件 | `packages/ez-docs/package.json`, `packages/create-ez-docs/package.json` |

**内容：**

补充两个包的发布相关配置：

```json
// packages/ez-docs/package.json 补充
{
  "publishConfig": {
    "access": "public"
  },
  "scripts": {
    "prepublishOnly": "pnpm run build && pnpm run test"
  }
}
```

```json
// packages/create-ez-docs/package.json
{
  "name": "create-ez-docs",
  "version": "0.1.0",
  "description": "Create a new ez-docs documentation project",
  "license": "MIT",
  "bin": {
    "create-ez-docs": "./dist/index.js"
  },
  "files": ["dist/", "templates/"],
  "publishConfig": {
    "access": "public"
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "prepublishOnly": "pnpm run build"
  }
}
```

配置 tsup 构建：

```typescript
// packages/ez-docs/tsup.config.ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",          // 主入口
    "src/next.ts",           // withEzdoc()
    "src/lib/config.ts",     // defineConfig / 类型
  ],
  format: ["esm"],
  dts: true,
  splitting: true,
  clean: true,
  external: ["next", "react", "react-dom"],
});
```

**验收：**
- `pnpm -r run build` — 两个包都构建成功
- `pnpm pack --filter ez-docs` — tarball 内容正确
- `pnpm pack --filter create-ez-docs` — tarball 包含 templates/

---

### T19 — GitHub Actions 自动发布工作流

| 属性 | 值 |
|------|-----|
| 阶段 | 2C |
| 依赖 | T18 |
| 文件 | `.github/workflows/release.yml` |

**内容：**

```yaml
name: Release to npm
on:
  push:
    tags: ["v*"]

concurrency:
  group: release
  cancel-in-progress: false

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          registry-url: https://registry.npmjs.org

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build all packages
        run: pnpm -r run build

      - name: Run tests
        run: pnpm -r run test

      - name: Publish to npm
        run: pnpm -r publish --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
```

发布流程：

```bash
# 1. 更新版本号
pnpm -r exec -- pnpm version 0.1.0

# 2. 提交 + tag
git add .
git commit -m "release: v0.1.0"
git tag v0.1.0

# 3. 推送触发 CI
git push && git push --tags
```

**验收：** 推送 `v0.1.0` tag 后，Actions 自动构建 + 测试 + 发布到 npm。

---

### T20 — 端到端验证

| 属性 | 值 |
|------|-----|
| 阶段 | 2C |
| 依赖 | 所有任务 |
| 文件 | 无新文件（验证流程） |

**内容：**

完整的端到端验证清单：

| # | 测试场景 | 预期结果 |
|---|----------|----------|
| 1 | `npx create-ez-docs test-project` | 交互完成，项目生成 |
| 2 | `cd test-project && pnpm install` | 安装成功，ez-docs 在 node_modules 中 |
| 3 | `pnpm dev` | 开发服务器启动，页面可访问 |
| 4 | `pnpm build` | 静态构建成功，输出报告 |
| 5 | `pnpm ezdoc check` | 检查通过 |
| 6 | `pnpm ezdoc new guide/test-page` | 创建文档文件 |
| 7 | 创建 `overrides/mdx/callout.tsx` | 组件覆盖生效 |
| 8 | 删除 override 文件 | 回退到默认组件 |
| 9 | 创建 `overrides/layout/footer.tsx` | Footer 覆盖生效 |
| 10 | 修改 `primaryColor` | 主色调变化 |
| 11 | `pnpm ezdoc init-deploy github` | 生成 workflow 文件 |
| 12 | dogfooding: `cd website && pnpm build` | ezdoc 自身文档 33 页面构建成功 |
| 13 | `pnpm update ez-docs`（模拟升级） | 修改 packages/ez-docs → website 站自动获取新版本 |
| 14 | `pnpm -r publish --dry-run` | npm 发布预检通过 |

**验收：** 全部 14 个场景通过。

---

### T21 — 文档更新

| 属性 | 值 |
|------|-----|
| 阶段 | 2C |
| 依赖 | T20 |
| 文件 | `website/docs/zh/`, `website/docs/en/` |

**内容：**

更新 ezdoc 自身文档，覆盖 P2 新增能力：

| 文档 | 内容 |
|------|------|
| `getting-started.mdx` | 重写为 npm install 方式的入门流程 |
| `guide/configuration.mdx` | 新增 `search` 配置段说明 |
| `guide/deployment.mdx` | 更新为 npm 包模式下的部署流程 |
| `guide/component-overrides.mdx` | 更新为 npm 包模式下的 overrides 目录说明 |
| `guide/upgrading.mdx` | 新建 — npm update 升级指南 |

更新两种语言的 `docs.json` 导航。

**验收：** 文档覆盖所有新功能，dogfooding 构建通过。

---

## 任务统计

| 阶段 | 任务编号 | 数量 | 核心交付物 |
|------|---------|------|-----------|
| 2A Monorepo 拆分 | T01-T05 | 5 | pnpm workspace + 代码迁移 + 测试迁移 |
| 2A-PoC 技术验证 | T06-T07 | 2 | App Router 路由注入 + Turbopack 跨包 |
| 2B 路径解耦 | T08-T15 | 8 | withEzdoc() + 动态配置 + 主题注入 + 路由注入 |
| 2C 脚手架 + 发布 | T16-T21 | 6 | create-ez-docs + 模板 + npm 发布 + 文档 |
| **合计** | | **21** | |

---

## 建议实施路径

```
第一批（基础）:    T01 → T02 → T03 → T04, T05（并行）
                          │
                   里程碑：monorepo 结构可用
                          │
第二批（验证）:    T06, T07（并行）
                          │
                   里程碑：确定路由注入 + 组件覆盖方案
                          │
第三批（解耦）:    T08 → T09 → T10（串行，配置链条）
                   T08 → T11, T12, T13（并行，与 T09 无依赖）
                   T09 → T14
                   T08 → T15（依赖 T06 PoC 结果）
                          │
                   里程碑：npm 包模式 dev/build 可用
                          │
第四批（发布）:    T16 → T17（脚手架）
                   T18 → T19（发布）
                   T16, T18 可并行
                          │
第五批（收尾）:    T20 → T21
```

---

## 风险矩阵

| 风险 | 概率 | 影响 | 阻塞任务 | 应对策略 |
|------|------|------|---------|---------|
| App Router 不支持外部路由 | 高 | 阻塞 | T15 | PoC T06 提前验证，准备 A/B/D 三种方案 |
| Turbopack alias 不支持跨包 | 中 | 阻塞 | T08 | 降级为 webpack alias |
| configSync 加载 TS 文件困难 | 中 | 延迟 | T09 | 改用 JSON 中间层或 tsx register |
| Windows 符号链接权限 | 低 | 降级 | T15 | 方案 A 失败时用方案 B（文件复制） |
| tsup 无法正确打包 CSS | 低 | 延迟 | T18 | 改为直接发布源码 + postinstall 编译 |
