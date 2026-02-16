# P2：npm 包提取 — 从一体化项目到可安装框架

> P1 在单仓库内建立了"框架边界"（配置校验、组件覆盖、CLI、部署）。
> P2 的目标是 **将这条边界物理化** — 让用户能 `npm install ez-docs` 使用，而不是 fork 仓库。

### 已确认决策

| # | 决策项 | 结论 |
|---|--------|------|
| D1 | npm 包名 | `ez-docs`（核心框架）、`create-ez-docs`（脚手架） |
| D2 | 路由注入 | **排除方案 C**（薄路由层），用户项目不得出现 `src/app/`，仅验证 A/B/D |
| D3 | dogfooding workspace | 目录命名为 `website/`（非 `docs/`），避免与文档内容目录混淆 |
| D4 | 仓库策略 | **新建仓库**（`ez-docs`），当前 `ezdoc` 仓库归档 |

---

## 一、P1 完成后的现状

### 1.1 已建立的边界

| 层 | P1 交付物 | 状态 |
|----|----------|------|
| 配置层 | Zod schema 校验、`defineConfig()` 类型安全、错误格式化 | ✅ |
| 组件层 | 19 个可覆盖组件（13 MDX + 6 Layout）、Turbopack resolveAlias | ✅ |
| 引擎层 | MDX 编译、导航解析、TOC 提取、面包屑、翻页 | ✅ |
| CLI 层 | 6 个命令（dev/build/new/check/deploy/init-deploy） | ✅ |
| 部署层 | GitHub Pages + Server 双模式、CI 模板生成 | ✅ |
| 测试层 | vitest 54 个单元测试覆盖核心模块 | ✅ |
| 文档层 | 中英双语 13 篇文档完整对应 | ✅ |

### 1.2 仍然存在的问题

P1 的边界是 **逻辑边界**，不是物理边界。用户仍然需要 fork 仓库：

```
当前：用户 fork → 修改 docs/ + ezdoc.config.ts → 部署
      问题：框架代码和用户代码混在同一个仓库
      升级：无法 npm update，只能手动 cherry-pick

目标：用户 npx create-ez-docs my-docs → 写 docs/ → 部署
      框架：npm install ez-docs 安装，版本可控
      升级：npm update ez-docs 一键升级
```

---

## 二、P2 目标架构

### 2.1 Monorepo 结构

```
ez-docs/                            # Monorepo 根（新仓库）
├── packages/
│   ├── ez-docs/                    # 核心框架 npm 包
│   │   ├── src/
│   │   │   ├── app/                # 默认路由（框架控制）
│   │   │   ├── components/
│   │   │   │   ├── layout/         # 布局组件（可覆盖）
│   │   │   │   ├── mdx/            # MDX 组件（可覆盖）
│   │   │   │   └── search/         # 搜索组件
│   │   │   ├── lib/
│   │   │   │   ├── config.ts       # 配置 schema + 加载
│   │   │   │   ├── docs.ts         # 导航/面包屑/翻页
│   │   │   │   ├── mdx.ts          # MDX 编译引擎
│   │   │   │   ├── nav-types.ts    # 纯类型（客户端安全）
│   │   │   │   ├── file-scanner.ts # 文件扫描
│   │   │   │   └── component-registry.ts
│   │   │   └── styles/
│   │   │       └── globals.css     # 默认样式 + 设计 token
│   │   ├── cli/
│   │   │   ├── index.ts            # CLI 入口
│   │   │   ├── dev.ts
│   │   │   ├── build.ts
│   │   │   ├── new-page.ts
│   │   │   ├── check.ts
│   │   │   ├── deploy.ts
│   │   │   └── init-deploy.ts
│   │   ├── next.ts                 # withEzdoc() Next.js 插件
│   │   └── package.json            # name: "ez-docs"
│   │
│   └── create-ez-docs/             # 脚手架 npm 包
│       ├── index.ts
│       ├── templates/              # 项目模板文件
│       └── package.json            # name: "create-ez-docs"
│
├── website/                        # ezdoc 自身文档（dogfooding）
│   ├── ezdoc.config.ts
│   ├── docs/
│   │   ├── zh/
│   │   └── en/
│   ├── overrides/
│   ├── next.config.ts              # import { withEzdoc } from "ez-docs/next"
│   └── package.json                # 依赖 "ez-docs": "workspace:*"
│
├── pnpm-workspace.yaml
└── turbo.json
```

### 2.2 用户项目结构（create-ez-docs 生成）

```
my-docs/                            # 用户项目（最小文件集）
├── ezdoc.config.ts                 # 唯一配置文件
├── docs/
│   ├── zh/
│   │   ├── docs.json               # 导航配置
│   │   └── getting-started.mdx
│   └── en/
│       ├── docs.json
│       └── getting-started.mdx
├── overrides/                      # 可选：组件覆盖
│   └── layout/
│       └── footer.tsx
├── public/                         # 静态资源
│   └── favicon.ico
├── next.config.ts                  # 一行配置
├── package.json                    # 依赖 "ez-docs"
└── tsconfig.json                   # 框架生成
```

用户的 `next.config.ts` 只需：

```typescript
import { withEzdoc } from "ez-docs/next";
export default withEzdoc({});
```

---

## 三、分阶段实施

### Phase 2A：Monorepo 拆分 + 包结构搭建

**目标：** 将当前单仓库拆为 monorepo，框架代码和示例文档物理分离，但功能行为不变。

#### T01 — 初始化 Monorepo 结构

| 属性 | 值 |
|------|-----|
| 依赖 | 无 |
| 文件 | `pnpm-workspace.yaml`, `turbo.json` |

**内容：**

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
    "build": { "dependsOn": ["^build"] },
    "dev": { "persistent": true },
    "test": {},
    "check-types": {}
  }
}
```

安装 turborepo：`pnpm add -Dw turbo`

**验收：** `pnpm -r run build` 能遍历所有 workspace。

---

#### T02 — 移动框架代码到 packages/ez-docs

| 属性 | 值 |
|------|-----|
| 依赖 | T01 |
| 文件 | `packages/ez-docs/*` |

**内容：**

将以下目录/文件移入 `packages/ez-docs/`：

| 源 | 目标 |
|----|------|
| `src/` | `packages/ez-docs/src/` |
| `cli/` | `packages/ez-docs/cli/` |
| `public/` | 保留在 docs 站（非框架资产） |

更新所有内部 import 路径。

**验收：** 移动后 `packages/ez-docs` 目录自包含，无对根目录 `src/` 的引用。

---

#### T03 — 配置 packages/ez-docs/package.json

| 属性 | 值 |
|------|-----|
| 依赖 | T02 |
| 文件 | `packages/ez-docs/package.json` |

**内容：**

```json
{
  "name": "ez-docs",
  "version": "0.1.0",
  "type": "module",
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
    "./components/*": {
      "types": "./dist/components/*.d.ts",
      "import": "./dist/components/*.js"
    },
    "./styles": "./src/styles/globals.css"
  },
  "files": ["dist/", "cli/", "src/styles/"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch"
  }
}
```

关键决策：
- `exports` 定义对外 API 表面
- `./next` 子路径导出 `withEzdoc()` 插件
- `./components/*` 允许用户导入组件类型
- `./styles` 导出默认 CSS

**验收：** `pnpm pack` 生成的 tarball 结构正确。

---

#### T04 — 将当前项目根目录改造为 dogfooding 文档站

| 属性 | 值 |
|------|-----|
| 依赖 | T02, T03 |
| 文件 | `website/package.json`, `website/next.config.ts` |

**内容：**

当前项目根目录的 `docs/`、`ezdoc.config.ts`、`next.config.ts` 移入 monorepo 的 `website/` workspace（使用 `website/` 避免与文档内容目录 `docs/` 混淆）：

```json
// website/package.json
{
  "name": "ez-docs-website",
  "private": true,
  "dependencies": {
    "ez-docs": "workspace:*"
  }
}
```

```typescript
// website/next.config.ts
import { withEzdoc } from "ez-docs/next";
export default withEzdoc({});
```

**验收：** `cd website && pnpm dev` 启动的文档站行为与 P1 完全一致。

---

### Phase 2B：路径解耦 — 核心技术挑战

> **这是 P2 最难的部分。** 当前框架代码有 5 个硬耦合点依赖用户项目文件的绝对路径。
> npm 包化后，框架代码在 `node_modules/ez-docs/` 中，必须能正确访问用户项目根目录的文件。

#### 2B.0 — 技术验证 PoC（优先级最高）

在正式开工前，**必须先验证以下两个技术方案的可行性：**

##### PoC 1：App Router 路由注入

Next.js App Router 要求路由文件在项目的 `src/app/` 或 `app/` 目录下。框架的路由在 `node_modules/ez-docs/src/app/` 中，Next.js 不会识别。

**候选方案：**（方案 C 已排除 — 决策 D2）

| 方案 | 原理 | 优点 | 风险 |
|------|------|------|------|
| A. 符号链接 | CLI `ezdoc dev/build` 时创建 `.ezdoc/app → node_modules/ez-docs/src/app` 符号链接 | 简单直接 | Windows 兼容性 |
| B. 文件复制 | CLI 启动时将路由文件复制到用户项目 `.ezdoc/` 临时目录 | 不依赖符号链接 | 需要 `.gitignore`；文件同步问题 |
| ~~C. transpilePackages~~ | ~~用户项目中极薄路由文件~~ | — | **已排除：用户项目不得出现 `src/app/`** |
| D. rootDir 重定向 | 修改 Next.js rootDir 指向框架目录，docs/ 通过别名访问 | 彻底解决 | Next.js 可能不支持 |

**验证方法：** 创建一个最小 Next.js 16 项目，尝试 A/B/D 三种方案，确认 `output: "export"` 下静态生成可用。

##### PoC 2：Turbopack resolveAlias 跨包解析

当前组件覆盖依赖 Turbopack 的 `resolveAlias`。需要验证：

```typescript
// 框架在 node_modules/ez-docs/ 中设置 alias
turbopack: {
  resolveAlias: {
    // 将框架内部的 import 指向用户项目的 overrides/
    "@/components/mdx/callout": "/absolute/path/to/user-project/overrides/mdx/callout"
  }
}
```

**关键问题：** Turbopack 是否支持将 node_modules 内的 import 重定向到项目根目录的文件？

**验证方法：** 在 PoC 1 的基础上，测试 overrides 目录的别名解析。

---

#### T05 — withEzdoc() Next.js 插件

| 属性 | 值 |
|------|-----|
| 依赖 | PoC 验证通过 |
| 文件 | `packages/ez-docs/src/next.ts` |

**内容：**

```typescript
// packages/ez-docs/src/next.ts
import type { NextConfig } from "next";
import path from "path";
import { buildResolveAlias } from "./lib/component-registry";

interface EzdocNextOptions {
  /** 额外的 Next.js 配置 */
  nextConfig?: NextConfig;
}

export function withEzdoc(options: EzdocNextOptions = {}): NextConfig {
  const projectRoot = process.cwd();
  const configPath = path.join(projectRoot, "ezdoc.config.ts");

  // 动态加载用户配置
  const ezdocConfig = loadConfigSync(configPath);

  // 构建组件覆盖别名
  const overridesDir = path.join(projectRoot, ezdocConfig.overrides?.dir ?? "overrides");
  const resolveAlias = buildResolveAlias(overridesDir);
  const hasOverrides = Object.keys(resolveAlias).length > 0;

  const basePath = process.env.EZDOC_BASE_PATH ?? ezdocConfig.deploy?.basePath ?? "";

  return {
    ...options.nextConfig,
    output: "export",
    basePath: basePath || undefined,
    trailingSlash: true,
    images: { unoptimized: true },
    env: {
      NEXT_PUBLIC_BASE_PATH: basePath || "",
    },
    ...(hasOverrides && {
      turbopack: { resolveAlias },
    }),
  };
}
```

**验收：** 用户项目中 `import { withEzdoc } from "ez-docs/next"` 可用，配置自动注入。

---

#### T06 — 配置加载链改造

| 属性 | 值 |
|------|-----|
| 依赖 | T02 |
| 文件 | `packages/ez-docs/src/lib/config-loader.ts` |

**内容：**

当前 `src/lib/config.ts` 通过 `import ezdocConfig from "@config"` 在编译时绑定配置文件。npm 包化后需要运行时动态加载：

```typescript
// packages/ez-docs/src/lib/config-loader.ts
import path from "path";
import { ezdocSchema, type ResolvedEzdocConfig } from "./config";

let _cachedConfig: ResolvedEzdocConfig | null = null;

/**
 * 从用户项目根目录动态加载 ezdoc.config.ts
 */
export async function loadConfig(projectRoot?: string): Promise<ResolvedEzdocConfig> {
  if (_cachedConfig) return _cachedConfig;

  const root = projectRoot ?? process.cwd();
  const configPath = path.join(root, "ezdoc.config.ts");

  const mod = await import(configPath);
  const raw = mod.default;

  const result = ezdocSchema.safeParse(raw);
  if (!result.success) {
    formatValidationErrors(result.error, "ezdoc.config.ts");
    process.exit(1);
  }

  _cachedConfig = result.data;
  return result.data;
}

/**
 * 同步版本 — 供 next.config.ts 使用（不支持 top-level await）
 */
export function loadConfigSync(configPath: string): ResolvedEzdocConfig {
  // 使用 tsx 或 Node.js 内置的 TypeScript 支持同步加载
  // 具体实现取决于 PoC 验证结果
}
```

**关键改动：** 所有使用 `import ezdocConfig from "@config"` 的地方改为调用 `loadConfig()`。

涉及文件：
- `src/lib/docs.ts` — 顶层 `import ezdocConfig from "@config"` → 函数参数传入或 `loadConfig()`
- `src/lib/mdx.ts` — 同上
- `src/app/` 路由文件 — 所有 `ezdocConfig` 引用

**验收：** 删除 `tsconfig.json` 的 `@config` 别名后，框架仍能正确加载用户配置。

---

#### T07 — process.cwd() 收敛

| 属性 | 值 |
|------|-----|
| 依赖 | T06 |
| 文件 | `packages/ez-docs/src/lib/docs.ts`, `mdx.ts` |

**内容：**

当前 `docs.ts` 和 `mdx.ts` 中有 12 处 `process.cwd()` 调用。统一收敛为：

```typescript
// packages/ez-docs/src/lib/paths.ts

/**
 * 获取用户项目根目录。
 * npm 包模式下 process.cwd() 就是用户项目根。
 */
export function getProjectRoot(): string {
  return process.env.EZDOC_PROJECT_ROOT ?? process.cwd();
}

/**
 * 获取文档目录绝对路径。
 */
export function getDocsDir(locale: string, config: ResolvedEzdocConfig): string {
  const dir = config.docs?.dir ?? "docs";
  return path.join(getProjectRoot(), dir, locale);
}
```

将所有直接使用 `process.cwd()` 的地方替换为 `getProjectRoot()`。

好处：
- 测试时可通过环境变量覆盖
- 未来支持 monorepo 子项目时有扩展点

**验收：** 全局搜索 `process.cwd()` 仅在 `paths.ts` 中出现。

---

#### T08 — CSS 主题动态注入

| 属性 | 值 |
|------|-----|
| 依赖 | T05 |
| 文件 | `packages/ez-docs/src/lib/theme.ts`, `src/app/layout.tsx` |

**内容：**

当前 `theme.primaryColor` 配置项存在但未被 `globals.css` 使用。CSS 变量硬编码为 OKLch 值。

实现方案：

```typescript
// packages/ez-docs/src/lib/theme.ts

/**
 * 将 hex 颜色转为 OKLch CSS 变量覆盖字符串。
 * 输入：#3b82f6
 * 输出：:root { --primary: oklch(0.62 0.21 264); }
 */
export function generateThemeOverrides(config: ResolvedEzdocConfig): string {
  const css: string[] = [];

  if (config.theme.primaryColor) {
    const oklch = hexToOklch(config.theme.primaryColor);
    css.push(`:root { --primary: ${oklch}; --sidebar-primary: ${oklch}; }`);
    // 深色模式适配
    const darkOklch = lightenOklch(oklch, 0.1);
    css.push(`.dark { --primary: ${darkOklch}; --sidebar-primary: ${darkOklch}; }`);
  }

  if (config.theme.accentColor) {
    const oklch = hexToOklch(config.theme.accentColor);
    css.push(`:root { --accent: ${oklch}; }`);
  }

  return css.join("\n");
}
```

在 `layout.tsx` 的 `<head>` 中注入：

```tsx
// src/app/layout.tsx
<head>
  <style dangerouslySetInnerHTML={{ __html: generateThemeOverrides(config) }} />
</head>
```

**验收：** 用户在 `ezdoc.config.ts` 中设置 `primaryColor: "#10b981"` 后，站点主色调变为绿色。

---

#### T09 — TypeScript 路径别名处理

| 属性 | 值 |
|------|-----|
| 依赖 | T05 |
| 文件 | `packages/ez-docs/cli/init.ts` |

**内容：**

当前 `tsconfig.json` 中的别名 `@config`、`@overrides/*` 是硬编码的。npm 包化后，用户项目需要自己的 tsconfig。

方案：`create-ez-docs` 生成用户项目时自动写入正确的 tsconfig；`ezdoc` CLI 在 `dev/build` 时验证别名配置。

用户项目的 `tsconfig.json`：

```json
{
  "extends": "ez-docs/tsconfig.base.json",
  "compilerOptions": {
    "paths": {
      "@overrides/*": ["./overrides/*"]
    }
  }
}
```

框架提供 `tsconfig.base.json`：

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }]
  }
}
```

**验收：** 用户项目的 TypeScript 编译无报错，override 组件有类型提示。

---

### Phase 2C：create-ez-docs 脚手架 + npm 发布

#### T10 — create-ez-docs 交互式脚手架

| 属性 | 值 |
|------|-----|
| 依赖 | T04, T09 |
| 文件 | `packages/create-ez-docs/` |

**内容：**

```bash
npx create-ez-docs my-docs
```

交互流程（使用 Node.js 原生 `readline`，不引入第三方依赖）：

```
✓ 项目名称: my-docs

? 站点标题: My Documentation

? 默认语言:
  > 中文 (zh)
    English (en)
    中文 + English

? 部署目标:
  > GitHub Pages
    私有服务器
    两者都有

正在创建项目...
  ✓ 生成 ezdoc.config.ts
  ✓ 生成 docs/zh/getting-started.mdx
  ✓ 生成 docs/zh/docs.json
  ✓ 生成 next.config.ts
  ✓ 生成 tsconfig.json
  ✓ 生成 package.json
  ✓ 安装依赖...

完成! 运行以下命令开始:
  cd my-docs
  pnpm dev
```

**验收：** 全流程可走通，生成的项目 `pnpm dev` 能直接启动。

---

#### T11 — 项目模板文件

| 属性 | 值 |
|------|-----|
| 依赖 | T10 |
| 文件 | `packages/create-ez-docs/templates/` |

**内容：**

```
packages/create-ez-docs/templates/
├── ezdoc.config.ts.tpl           # 配置文件模板
├── next.config.ts.tpl            # Next.js 配置
├── tsconfig.json.tpl             # TypeScript 配置
├── package.json.tpl              # package.json 模板
├── .gitignore.tpl                # .gitignore
├── docs/
│   └── __LOCALE__/               # __LOCALE__ 运行时替换
│       ├── getting-started.mdx
│       └── docs.json
└── public/
    └── favicon.ico
```

模板变量：`__TITLE__`、`__LOCALE__`、`__BASE_PATH__`、`__DEPLOY_TARGET__`

**验收：** 模板文件变量替换后是合法的代码文件，生成项目能构建。

---

#### T12 — npm 发布配置

| 属性 | 值 |
|------|-----|
| 依赖 | T03, T11 |
| 文件 | `packages/ez-docs/package.json`, `packages/create-ez-docs/package.json` |

**内容：**

两个包的发布配置：

```json
// packages/ez-docs/package.json
{
  "name": "ez-docs",
  "version": "0.1.0",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/Coldplay-now/ez-docs"
  },
  "files": ["dist/", "cli/", "src/styles/", "tsconfig.base.json"],
  "publishConfig": {
    "access": "public"
  }
}
```

```json
// packages/create-ez-docs/package.json
{
  "name": "create-ez-docs",
  "version": "0.1.0",
  "bin": {
    "create-ez-docs": "./dist/index.js"
  },
  "files": ["dist/", "templates/"]
}
```

**验收：** `pnpm -r publish --dry-run` 无报错，包内容正确。

---

#### T13 — GitHub Actions 自动发布工作流

| 属性 | 值 |
|------|-----|
| 依赖 | T12 |
| 文件 | `.github/workflows/release.yml` |

**内容：**

```yaml
name: Release
on:
  push:
    tags: ["v*"]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org
      - run: pnpm install --frozen-lockfile
      - run: pnpm -r run build
      - run: pnpm -r run test
      - run: pnpm -r publish --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**验收：** 推送 `v0.1.0` tag 后自动发布到 npm。

---

## 四、技术风险与应对策略

### 4.1 最高风险：App Router 路由注入

| 风险 | 影响 | 应对 |
|------|------|------|
| Next.js 不支持从 node_modules 提供 App Router 路由 | 阻塞整个 P2 | **Phase 2A 完成后立即做 PoC** |

四种候选方案：

**方案 A（推荐）：符号链接**
```
ezdoc dev 执行时：
  1. 创建 .ezdoc/ 临时目录
  2. symlink: .ezdoc/app → node_modules/ez-docs/src/app
  3. 修改 next.config.ts 的 appDir 指向 .ezdoc/app
  4. 执行 next dev
```
- 优点：最简单，对 Next.js 透明
- 风险：Windows 符号链接需要管理员权限

**方案 B：文件复制**
```
ezdoc dev 执行时：
  1. 复制 node_modules/ez-docs/src/app → .ezdoc/app
  2. .ezdoc 加入 .gitignore
  3. 执行 next dev
```
- 优点：跨平台兼容
- 风险：文件同步；包更新后需重新复制

~~**方案 C：薄路由层 — 已排除（决策 D2）**~~

> 用户项目不得出现 `src/app/` 目录。

**方案 D：自定义构建管线**
```
完全不用 Next.js 的 app/ 约定：
  ezdoc build 自己调用 Next.js 的编译 API
  框架控制整个构建过程
```
- 优点：最灵活
- 风险：实现复杂；与 Next.js 更新耦合深

**PoC 优先级：A → B → D**

### 4.2 中等风险：Turbopack resolveAlias 跨包

| 风险 | 影响 | 应对 |
|------|------|------|
| Turbopack alias 不支持将 node_modules 内的 import 重定向到项目文件 | 组件覆盖机制失效 | 改为 webpack alias（降级方案） |

验证方法：在 PoC 中测试当框架代码在 `node_modules/ez-docs/` 中时，以下配置是否生效：

```typescript
turbopack: {
  resolveAlias: {
    // 框架内部 import "@/components/mdx/callout"
    // → 用户项目 /project/overrides/mdx/callout.tsx
    "@/components/mdx/callout": "/absolute/path/to/overrides/mdx/callout"
  }
}
```

### 4.3 低风险：gray-matter 与 next-mdx-remote 重复

| 风险 | 影响 | 应对 |
|------|------|------|
| 两个库都解析 frontmatter | 性能浪费、依赖冗余 | P2 统一为只用 next-mdx-remote 的 `parseFrontmatter: true` |

当前 `docs.ts` 中 `readFrontmatter()` 使用 `gray-matter` 读取标题（用于导航显示），而 `mdx.ts` 中 `compileMDX()` 已通过 `parseFrontmatter: true` 解析。P2 可移除 `gray-matter` 依赖，改为缓存 frontmatter 提取结果。

### 4.4 低风险：Pagefind 集成路径

| 风险 | 影响 | 应对 |
|------|------|------|
| Pagefind 需要知道输出目录 | 搜索索引路径错误 | CLI `ezdoc build` 中已处理，确保路径传递正确即可 |

---

## 五、依赖关系与实施顺序

```
Phase 2A（基础搭建）
  T01 初始化 Monorepo ──────────────────────┐
    │                                        │
  T02 移动框架代码 → T03 配置 package.json   │
    │                                        │
  T04 改造 dogfooding 文档站（website/）      │
    │                                        │
    └── 验证：pnpm dev / build 行为不变 ─────┘
                    │
          PoC 技术验证（最高优先级）
          ├── PoC 1: App Router 路由注入
          └── PoC 2: Turbopack 跨包 alias
                    │
Phase 2B（路径解耦）
  T05 withEzdoc() Next.js 插件 ─────────────┐
    │                                        │
  T06 配置加载链改造                          │
    │                                        │
  T07 process.cwd() 收敛                     │
    │                                        │
  T08 CSS 主题动态注入                        │
    │                                        │
  T09 TypeScript 别名处理                     │
    │                                        │
    └── 验证：用户项目 pnpm dev/build 可用 ──┘
                    │
Phase 2C（脚手架 + 发布）
  T10 create-ez-docs 交互式脚手架 ──────────┐
    │                                        │
  T11 项目模板文件                            │
    │                                        │
  T12 npm 发布配置                            │
    │                                        │
  T13 GitHub Actions 自动发布 ───────────────┘
```

---

## 六、成功标准

P2 完成后，ezdoc 应满足以下标准：

### 用户体验

| # | 标准 | 验证方式 |
|---|------|----------|
| 1 | 30 秒创建新文档站 | `npx create-ez-docs my-docs && cd my-docs && pnpm dev` |
| 2 | 用户项目无框架源码 | 项目中无 `src/app/` 目录 |
| 3 | 一键升级 | `pnpm update ez-docs` 后行为不变或有新功能 |
| 4 | 组件覆盖仍可用 | `overrides/mdx/callout.tsx` 在 npm 包模式下生效 |
| 5 | CLI 命令全部可用 | `ezdoc dev/build/new/check/deploy/init-deploy` |

### 技术指标

| # | 标准 | 验证方式 |
|---|------|----------|
| 6 | npm 包大小合理 | `ez-docs` 包 < 500KB（不含 node_modules） |
| 7 | 依赖数可控 | peerDependencies 只有 next + react |
| 8 | 类型导出完整 | `import type { EzdocConfig, CalloutProps } from "ez-docs"` 可用 |
| 9 | dogfooding 通过 | ezdoc 自身文档使用 `workspace:*` 版本运行 |
| 10 | CI 发布自动化 | 推送 tag 后自动发布到 npm |

---

## 七、任务统计

| 阶段 | 任务数 | 核心交付物 |
|------|--------|-----------|
| 2A Monorepo 拆分 | T01-T04 (4) | pnpm workspace + 代码迁移 + dogfooding |
| PoC 技术验证 | 2 项 | App Router 路由注入 + Turbopack 跨包 alias |
| 2B 路径解耦 | T05-T09 (5) | withEzdoc() 插件 + 配置动态加载 + 主题注入 |
| 2C 脚手架 + 发布 | T10-T13 (4) | create-ez-docs + 模板 + npm 发布流程 |
| **合计** | **13 + 2 PoC** | |

---

## 八、与 P3+ 的衔接

P2 完成后，后续版本的改进将通过 npm 更新交付给用户：

| 版本 | 内容 | 用户升级方式 |
|------|------|------------|
| P3 搜索增强 | jieba-wasm 中文分词、Algolia 可选、按语言过滤 | `npm update ez-docs` |
| P4 内容管理 | 版本化文档、翻译过期检测、OpenAPI 生成 | `npm update ez-docs` |
| P5 主题系统 | 多主题支持、社区主题市场 | `npm update ez-docs` + 配置切换 |

**这正是 P2 的核心价值 — 建立升级通道。** P1 让框架有了边界，P2 让边界可以升级。
