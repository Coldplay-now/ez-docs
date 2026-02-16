# ezdoc 框架演进规划

## 一、ezdoc 今天是什么

### 1.1 现状诊断

ezdoc 当前是一个 **可 fork 的文档站模板（starter template）**，不是一个框架。

判断标准很简单 — 用户如何开始使用？

| 使用方式 | 代表 | ezdoc 现状 |
|----------|------|-----------|
| `npm install framework` + 写配置 | VitePress、Docusaurus | ❌ |
| `npx create-xxx` + 只管 docs/ | Fumadocs、Mintlify | ❌ |
| Fork 仓库 → 修改源码 → 部署 | 大多数 template 项目 | ✅ 当前模式 |

这意味着：

- **没有升级路径**：框架改进后，用户无法 `npm update` 获得新功能，只能手动 cherry-pick
- **没有边界**：框架代码和用户定制混在一起，无法区分"哪些文件是我改过的"
- **没有生态**：第三方无法开发插件/主题，因为没有扩展点

### 1.2 当前架构的四层模型

```
┌──────────────────────────────────────────────────┐
│  L4  内容层      docs/  +  ezdoc.config.ts       │  ← 用户应该只碰这里
├──────────────────────────────────────────────────┤
│  L3  组件层      components/mdx/ + layout/       │  ← 用户想定制的部分
├──────────────────────────────────────────────────┤
│  L2  引擎层      lib/mdx.ts + lib/docs.ts        │  ← 用户不应该碰
├──────────────────────────────────────────────────┤
│  L1  基础设施    Next.js + Tailwind + Shiki      │  ← 用户不知道它存在
└──────────────────────────────────────────────────┘
```

问题在于：**这四层在文件系统里没有物理隔离。** 它们全部平铺在同一个 `src/` 下，用户 fork 后会修改任何一层，导致后续升级无从下手。

### 1.3 现有资产盘点

| 模块 | 文件 | 行数 | 成熟度 |
|------|------|------|--------|
| MDX 引擎 | `lib/mdx.ts` | 170 | 高 — remark/rehype 插件链稳定 |
| 导航引擎 | `lib/docs.ts` + `lib/nav-types.ts` | 350 | 高 — 支持嵌套、面包屑、翻页 |
| 配置系统 | `lib/config.ts` + `ezdoc.config.ts` | 100 | 中 — 类型定义完整但无运行时校验 |
| 布局组件 | `components/layout/*` (7 个) | 900 | 高 — header/sidebar/toc/breadcrumb |
| MDX 组件 | `components/mdx/*` (14 个) | 1750 | 高 — 覆盖面超过多数竞品 |
| 搜索 | `components/search/*` (2 个) | 300 | 中 — Pagefind 集成可用但无中文分词 |
| 路由 | `app/**` | 250 | 中 — 硬编码路由结构 |
| 主题 | `globals.css` + oklch tokens | 200 | 高 — 现代设计 token 体系 |

**总代码量：约 4000 行 TypeScript/CSS。** 这是一个体量适中、易于重构的代码库。

---

## 二、ezdoc 应该成为什么

### 2.1 定位

**ezdoc 应该成为"文档领域的 Next.js" — 一个约定优于配置的、开箱即用的文档框架。**

```
                    灵活性 ↑
                          │
              Fumadocs    │   ← 组件库，用户自己搭
                          │
                  ezdoc   │   ← 开箱即用，可定制
                          │
              VitePress   │   ← 约定优于配置
                          │
              Mintlify    │   ← SaaS，最受限
                          │
                          └────────────────→ 易用性
```

核心主张：

1. **零配置启动**：`npx create-ezdoc my-docs && cd my-docs && npm run dev` — 30 秒看到文档站
2. **只管内容**：用户项目里只有 `docs/`、`ezdoc.config.ts`、可选的 `overrides/`
3. **可逃逸**：需要深度定制时，可以 `eject` 回模板模式，或通过覆盖机制替换任何组件
4. **可升级**：`npm update ezdoc` 就能获得新功能和 bug 修复

### 2.2 ezdoc 不应该做什么

- **不做插件系统** — Docusaurus 的插件系统是它最大的复杂性来源。ezdoc 用"组件覆盖"替代插件
- **不做主题市场** — 先做好一个默认主题。主题系统是 P3+ 的事
- **不做 SaaS** — 始终是自托管、静态部署
- **不做非文档场景** — 不是博客框架、不是 CMS，专注文档

### 2.3 与竞品的差异化

| 维度 | Docusaurus | VitePress | Fumadocs | ezdoc（目标） |
|------|-----------|-----------|----------|-------------|
| 上手时间 | 5 分钟 | 3 分钟 | 10 分钟 | **1 分钟** |
| 技术栈 | React (CSR) | Vue | Next.js | **Next.js 16** |
| 部署 | 静态 | 静态 | Node/静态 | **纯静态** |
| 中文支持 | 一般 | 一般 | 一般 | **一等公民** |
| 定制方式 | 插件+swizzle | 主题扩展 | 代码组装 | **组件覆盖** |
| 组件丰富度 | 插件依赖 | 少 | 中 | **开箱15+** |

**ezdoc 的独特价值：最快的启动速度 + 最现代的技术栈 + 中文一等公民。**

---

## 三、架构边界模型

从模板到框架的核心转变是 **建立边界**。

### 3.1 目标文件结构

**框架侧（npm 包 `ezdoc`）：**

```
ezdoc/                          # npm 包
├── src/
│   ├── app/                    # 默认路由（用户不碰）
│   ├── components/
│   │   ├── layout/             # 布局组件
│   │   ├── mdx/                # MDX 组件
│   │   └── search/             # 搜索组件
│   ├── lib/
│   │   ├── mdx.ts              # MDX 编译引擎
│   │   ├── docs.ts             # 导航/面包屑/翻页
│   │   ├── nav-types.ts        # 纯类型（客户端安全）
│   │   └── config.ts           # 配置加载 + schema 校验
│   └── styles/
│       └── globals.css          # 默认样式 + 设计 token
├── cli/
│   ├── create.ts               # create-ezdoc 脚手架
│   ├── dev.ts                  # ezdoc dev
│   └── build.ts                # ezdoc build（含 pagefind）
├── template/                   # 新项目模板文件
└── package.json
```

**用户侧（`create-ezdoc` 生成的项目）：**

```
my-docs/                        # 用户项目
├── docs/
│   ├── zh/
│   │   ├── docs.json
│   │   ├── getting-started.mdx
│   │   └── guide/
│   └── en/
├── overrides/                  # 可选：组件覆盖
│   ├── layout/
│   │   └── header.tsx          # 覆盖默认 Header
│   └── mdx/
│       └── callout.tsx         # 覆盖默认 Callout
├── public/                     # 静态资源
├── ezdoc.config.ts             # 唯一配置文件
└── package.json                # 依赖 "ezdoc"
```

### 3.2 组件覆盖机制

这是整个框架化的核心设计。用户不需要理解 Next.js 的路由系统，只需要：

```
overrides/
└── mdx/
    └── callout.tsx   ← 放一个同名文件就覆盖了默认组件
```

**实现原理：**

```typescript
// ezdoc 框架内部的组件加载器
function loadComponent(name: string, category: string) {
  // 1. 优先查找用户覆盖
  const userOverride = tryResolve(`@overrides/${category}/${name}`);
  if (userOverride) return userOverride;

  // 2. 回退到框架默认
  return require(`./components/${category}/${name}`);
}
```

**可覆盖的组件清单（白名单）：**

| 类别 | 组件 | 说明 |
|------|------|------|
| layout | `header` | 顶部导航栏 |
| layout | `sidebar` | 侧边栏 |
| layout | `toc` | 右侧目录 |
| layout | `footer` | 页脚（框架提供默认空实现） |
| layout | `breadcrumb` | 面包屑 |
| mdx | `callout` | 提示框 |
| mdx | `tabs` | 标签页 |
| mdx | `code-pre` | 代码块 |
| mdx | 所有 14 个 MDX 组件 | 均可覆盖 |

### 3.3 配置层 vs 组件层 vs 引擎层

```
用户可控制：
  ├── ezdoc.config.ts        → 声明式配置（颜色、语言、站点信息）
  ├── docs/                   → 内容
  └── overrides/              → 组件级定制（命令式，TypeScript/React）

用户不可控制（框架内部）：
  ├── 路由结构                → /docs/[locale]/[...slug]
  ├── MDX 编译管线            → remark/rehype 插件链
  ├── 静态导出逻辑            → generateStaticParams
  └── 构建流程                → next build + pagefind
```

---

## 四、P1 分阶段实施

P1 的目标不是一步到位变成 npm 包，而是 **在当前代码库中建立框架边界，为将来的抽包做准备。**

### Phase 1A：配置校验与类型安全

**目标：** 配置写错了，开发者在终端看到清晰的错误信息。

**改动清单：**

| 文件 | 改动 |
|------|------|
| `package.json` | 新增 `zod` 依赖 |
| `src/lib/config.ts` | 用 Zod 定义 schema，`defineConfig` 时校验 |
| `src/lib/docs.ts` | `parseNavFile` 时校验 docs.json 结构 |

**设计：**

```typescript
// src/lib/config.ts
import { z } from "zod";

const localeSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
});

const ezdocSchema = z.object({
  site: z.object({
    title: z.string().min(1, "site.title 不能为空"),
    description: z.string().optional(),
    logo: z.string().optional(),
    favicon: z.string().optional(),
    url: z.string().url().optional(),
    socials: z.record(z.string()).optional(),
  }),
  docs: z.object({
    dir: z.string().default("docs"),
    nav: z.string().default("docs.json"),
  }).optional(),
  theme: z.object({
    defaultMode: z.enum(["light", "dark", "system"]).default("system"),
    primaryColor: z.string().optional(),
    accentColor: z.string().optional(),
  }).optional(),
  i18n: z.object({
    defaultLocale: z.string().default("zh"),
    locales: z.array(localeSchema).default([{ code: "zh", label: "中文" }]),
  }).optional(),
  // ...
});

export function defineConfig(raw: unknown): EzdocConfig {
  const result = ezdocSchema.safeParse(raw);
  if (!result.success) {
    console.error("[ezdoc] 配置校验失败:");
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }
  return result.data;
}
```

**docs.json 校验：**

```typescript
const navPageSchema: z.ZodType = z.union([
  z.string(),                                    // 字符串简写
  z.object({ title: z.string(), path: z.string() }),  // 显式页面
  z.object({                                     // 嵌套分组
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

### Phase 1B：组件注册表与覆盖机制

**目标：** 用户可以在 `overrides/` 目录放置同名组件来替换框架默认组件，无需修改框架源码。

**改动清单：**

| 文件 | 改动 |
|------|------|
| `src/lib/component-loader.ts` | 新建 — 组件注册表 |
| `src/components/mdx/mdx-components.tsx` | 改用注册表加载组件 |
| `tsconfig.json` | 新增 `@overrides` 路径别名 |
| `ezdoc.config.ts` 类型 | 新增 `overrides` 配置段 |

**设计：**

```typescript
// src/lib/component-loader.ts

// 编译时组件注册表
// 用户覆盖的组件在构建时通过路径别名解析
// overrides/mdx/callout.tsx → 替换默认 Callout

const MDX_COMPONENTS = [
  "callout", "tabs", "steps", "card", "accordion",
  "file-tree", "badge", "video", "image-zoom",
  "tooltip", "code-group", "code-pre", "mermaid",
] as const;

type ComponentName = typeof MDX_COMPONENTS[number];

export function buildComponentMap(): Record<string, React.ComponentType> {
  const map: Record<string, React.ComponentType> = {};

  for (const name of MDX_COMPONENTS) {
    // 构建时解析：优先用户覆盖，回退框架默认
    try {
      map[name] = require(`@overrides/mdx/${name}`).default;
    } catch {
      map[name] = require(`@/components/mdx/${name}`).default;
    }
  }

  return map;
}
```

实际实现会更细致 — 需要处理具名导出（如 `Tabs` + `TabItem`）和 Next.js 的模块解析。但核心思路是：**约定目录结构 + 路径别名 + 构建时解析。**

### Phase 1C：CLI 工具

**目标：** 用户通过 CLI 完成常见操作，不需要理解底层构建系统。

**改动清单：**

| 文件 | 改动 |
|------|------|
| `cli/index.ts` | 新建 — CLI 入口 |
| `cli/create.ts` | 新建 — 项目脚手架 |
| `cli/new-page.ts` | 新建 — 创建新文档页 |
| `template/` | 新建 — 项目模板文件 |
| `package.json` | 新增 `bin` 字段 |

**命令设计：**

```bash
# 创建新项目
npx create-ezdoc my-docs
  → 交互式选择语言/主题
  → 生成项目骨架
  → 安装依赖
  → 打印 "cd my-docs && npm run dev"

# 创建新文档页
npx ezdoc new guide/advanced-config
  → 创建 docs/{locale}/guide/advanced-config.mdx
  → 自动填充 frontmatter 模板
  → 提示手动更新 docs.json（或自动添加）

# 开发
npx ezdoc dev         → next dev

# 构建
npx ezdoc build       → next build && pagefind --site out

# 校验
npx ezdoc check       → 校验配置 + 检测无效链接 + 检查缺失翻译
```

### Phase 1D：构建流程统一

**目标：** 将分散的构建步骤收敛到框架控制。

**当前流程（3 步，用户需理解）：**

```bash
next build            # 构建 HTML
pagefind --site out   # 生成搜索索引
# 手动部署 out/
```

**目标流程（1 步）：**

```bash
ezdoc build
  → 校验 ezdoc.config.ts
  → 校验 docs.json
  → next build
  → pagefind --site out
  → 输出构建报告（页面数、词数、构建时间）
```

---

## 五、P1 之后的演进路线

### P2：抽包发布

将 P1 中已建立的边界物理化：

```
当前：一个仓库，所有代码平铺
  ↓
P2：monorepo，框架和模板分离
  ├── packages/ezdoc/           # 核心框架 npm 包
  ├── packages/create-ezdoc/    # 脚手架 npm 包
  └── docs/                     # ezdoc 自身文档（吃自己的狗粮）
```

**关键技术挑战：**

1. **Next.js App Router 的路由注入** — 框架需要提供默认路由，用户项目不需要 `src/app/` 目录。可能需要 Next.js 插件或构建时文件复制
2. **CSS 变量的继承** — 框架提供默认设计 token，用户通过 `ezdoc.config.ts` 的 `theme.primaryColor` 覆盖，编译时注入
3. **Pagefind 集成** — 搜索索引生成需要知道输出目录和语言配置

### P3：搜索增强

```
当前：Pagefind（不支持中文分词）
  ↓
P3a：集成 jieba-wasm 作为 Pagefind 的分词前端
P3b：可选 Algolia DocSearch 集成（通过配置切换）
P3c：搜索结果按当前语言过滤
```

### P4：内容管理增强

```
P4a：版本化文档
  └── docs/v1/  docs/v2/  + 版本选择器 UI

P4b：翻译管理
  └── 检测源语言更新 → 标记翻译过期 → 显示"本页尚未翻译"

P4c：API 文档生成
  └── OpenAPI spec → 自动生成 API 参考页面
```

---

## 六、P1 实施优先级与依赖关系

```
Phase 1A: 配置校验 ──────────────────┐
  无前置依赖                          │
  预计改动：3 个文件                   │
                                      │
Phase 1B: 组件覆盖机制 ──────────────┤──→ Phase 1D: 构建流程统一
  依赖 1A（配置中新增 overrides 段）  │     依赖 1A + 1C
  预计改动：4 个文件                   │     预计改动：3 个文件
                                      │
Phase 1C: CLI 工具 ──────────────────┘
  依赖 1A（CLI 调用配置校验）
  预计新增：5 个文件 + template/
```

**建议实施顺序：1A → 1B → 1C → 1D**

1A 是基础，为后续所有模块提供类型安全保障。1B 是框架化的核心差异点。1C 是用户体验的外在表现。1D 把一切收拢。

---

## 七、技术决策备忘

### 决策 1：不做运行时框架，做构建时框架

ezdoc 不在运行时提供路由系统或中间件。它在 **构建时** 生成完整的静态站点。这意味着：

- 不需要 Node.js 运行时
- 不需要边缘函数
- 用户的部署环境没有任何要求

**trade-off：** 放弃了动态功能（评论、认证、CMS 集成）。这是有意为之 — ezdoc 专注静态文档。

### 决策 2：组件覆盖 vs 插件系统

插件系统（Docusaurus 模式）的问题：

- 学习成本高 — 用户需要理解生命周期钩子
- 维护成本高 — 插件 API 变更导致第三方插件失效
- 调试困难 — 多个插件可能冲突

组件覆盖（ezdoc 选择）的优势：

- 零学习成本 — 用户写的就是普通 React 组件
- 明确的接口 — 组件的 props 就是 API
- 局部影响 — 覆盖一个组件不影响其他组件

### 决策 3：单包 vs 多包

Fumadocs 是三个包（core + ui + mdx），ezdoc 应该是 **一个包**。

理由：

- ezdoc 的定位是"开箱即用"，不是"自由组装"
- 单包意味着版本永远一致，不存在兼容性问题
- 用户的心智模型更简单：`npm install ezdoc`，结束

### 决策 4：中文优先

多数文档框架的 i18n 是后加的。ezdoc 从第一天起就支持中文：

- 默认 locale 是 `zh`
- 搜索针对 CJK 优化（P3 优先级）
- UI 标签默认中文（筛选页面、未找到、最后更新于）
- 文档目录下中文字符保留（不强制 ASCII slug）

这是 ezdoc 面向中文开发者社区的差异化优势。

---

## 八、部署模型：构建一次，部署到任何地方

ezdoc 是纯静态框架，构建产物是一个自包含的 `out/` 目录。差异仅在于 **产物怎么到达目标** 和 **URL 路径前缀**。

### 8.1 两种部署模式对比

```
                    GitHub Pages              私有服务器
────────────────────────────────────────────────────────────
URL 形态           user.github.io/repo-name   docs.company.com
basePath           必须设 "/repo-name"         通常为空 ""
触发方式           git push → Actions 自动构建   手动/CI 构建 → rsync 推送
HTTPS              GitHub 自动提供              自己配 nginx + Let's Encrypt
自定义域名         CNAME 文件                   DNS 直接指
构建环境           GitHub Actions runner        本地机器 / CI 服务器
访问控制           公开（或 Pro 私有）           自由控制（nginx auth / VPN）
────────────────────────────────────────────────────────────
构建命令           完全相同：ezdoc build
产物               完全相同：out/ 目录
```

### 8.2 GitHub Pages 部署流程

用户只需要做三件事：

```bash
# 1. 配置
# ezdoc.config.ts
deploy: {
  target: "github",
  basePath: "/my-docs",       # ← 仓库名
}

# 2. 一键初始化 CI
npx ezdoc init-deploy github
# → 自动生成 .github/workflows/deploy.yml
# → 自动生成正确的 basePath
# → 提示: "git push 后会自动部署"

# 3. 推送
git push
# → Actions 自动: ezdoc build → 部署到 gh-pages
```

框架生成的 workflow 文件：

```yaml
# .github/workflows/deploy.yml（框架自动生成）
name: Deploy docs
on:
  push:
    branches: [main]
    paths: [docs/**, ezdoc.config.ts]   # 只有文档变更才触发

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0              # 需要 git log 算 lastModified
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: npx ezdoc build
      - uses: actions/deploy-pages@v4
```

用户日常就是 **写 Markdown → git push → 自动上线**。

### 8.3 私有服务器部署流程

```bash
# 1. 配置
# ezdoc.config.ts
deploy: {
  target: "server",
  basePath: "",                # ← 根路径部署
  server: {
    host: "docs.company.com",
    user: "deploy",
    path: "/var/www/docs",
  },
}

# 2. 一键部署
npx ezdoc deploy
# → ezdoc build（校验 + 构建 + pagefind）
# → rsync -avz out/ deploy@docs.company.com:/var/www/docs/
# → 输出: "✓ 已部署到 https://docs.company.com"
```

也可以走 CI：

```bash
npx ezdoc init-deploy server
# → 生成 .github/workflows/deploy.yml（rsync 到服务器）
# → 提示设置 SSH_PRIVATE_KEY secret
```

### 8.4 框架内部的构建与部署管线

```
┌─────────────────────────────────────────────────────────────┐
│                      ezdoc build                            │
│                                                             │
│  1. 校验 ezdoc.config.ts（Zod schema）                      │
│  2. 校验所有 locale 的 docs.json                             │
│  3. 根据 deploy.target 决定 basePath                        │
│     ├── github → basePath = "/repo-name"                    │
│     │   → HTML 内所有资源路径带前缀                           │
│     │   → 搜索索引路径带前缀                                 │
│     │   → sitemap URL 带前缀                                │
│     └── server → basePath = ""                              │
│         → 所有路径从根开始                                    │
│  4. next build（静态导出 → out/）                            │
│  5. pagefind --site out                                     │
│  6. 输出构建报告（页面数、词数、构建时间）                     │
│                                                             │
│  产物完全自包含：out/ 复制到任何 HTTP 服务器都能工作            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      ezdoc deploy                           │
│                                                             │
│  根据 deploy.target 分支：                                   │
│                                                             │
│  github:                                                    │
│    → 检查是否在 git 仓库中                                    │
│    → 检查 GitHub remote                                     │
│    → 构建 → gh-pages 分支推送                                │
│                                                             │
│  server:                                                    │
│    → 检查 SSH 连接                                           │
│    → 构建 → rsync 到 server.path                            │
│    → 可选: SSH 执行 nginx reload                             │
│                                                             │
│  both:                                                      │
│    → 先部署 server，再部署 github                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.5 已有基础

当前 `ezdoc.config.ts` 中已预留 `deploy.target`、`deploy.basePath`、`deploy.server` 的类型定义，但没有实际功能。框架化后这些配置才真正生效。接口设计不需要变，只需要实现 CLI 侧的 `build` 和 `deploy` 命令。

---

## 九、成功标准

P1 完成后，ezdoc 应该满足以下标准：

### 框架能力

1. **配置错误有诊断** — `ezdoc.config.ts` 或 `docs.json` 写错时，终端显示明确错误信息和修复建议
2. **组件可替换** — 用户可以在 `overrides/` 放置自定义 Header，无需修改 `node_modules` 或框架源码
3. **一键启动** — `npx create-ezdoc my-docs && cd my-docs && npm run dev` 能在 30 秒内看到文档站
4. **一键构建** — `ezdoc build` 完成所有构建步骤并输出结果摘要
5. **可升级** — 用户项目中没有框架源码副本，`npm update ezdoc` 能获得新版本功能

### 部署能力

6. **GitHub Pages 零配置部署** — `ezdoc init-deploy github` 生成 CI 配置，git push 后自动构建部署，basePath 自动处理
7. **私有服务器一键部署** — `ezdoc deploy` 完成构建 + rsync，用户只需在配置中填写 host/user/path
8. **部署目标可切换** — 修改 `deploy.target` 就能在 GitHub Pages 和私有服务器之间切换，构建产物相同
9. **CI 模板自动生成** — `ezdoc init-deploy` 生成对应平台的 workflow 文件，用户不需要手写 YAML
