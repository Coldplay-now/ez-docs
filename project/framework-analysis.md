# ezdoc 框架对比分析

## 对标项目

| 框架 | 技术栈 | 定位 |
|------|--------|------|
| **Docusaurus** (Meta) | React + MDX | 通用文档站，生态最大 |
| **VitePress** (Vue) | Vue + Markdown | 轻量快速，Vue 生态首选 |
| **Nextra** (Vercel) | Next.js + MDX | Next.js 生态文档方案 |
| **Fumadocs** | Next.js App Router + MDX | 新一代 Next.js 文档框架 |
| **Mintlify** | Next.js + MDX | 商业化 API 文档平台 |
| **ezdoc** | Next.js 16 App Router + MDX | 轻量自托管文档框架 |

---

## ezdoc 的优势

### 1. 技术栈前沿性

ezdoc 建立在 Next.js 16 App Router + Tailwind v4 + oklch 色彩体系上，这在开源文档框架中比较少见。Docusaurus 仍然是 CSR 架构，Nextra 刚迁移到 App Router 还不稳定，VitePress 是 Vue 生态。Fumadocs 是最接近的竞品，但 ezdoc 的 Tailwind v4 + oklch 设计 token 体系更现代。

### 2. 纯静态导出

`output: "export"` 意味着零服务端依赖，可以部署到任何静态托管（GitHub Pages、Cloudflare Pages、S3）。Docusaurus 也是这个路线，但 Nextra 和 Fumadocs 通常依赖 Node 运行时。

### 3. MDX 组件丰富度

Callout、Tabs、Steps、Card、CodeGroup、FileTree、Accordion、Badge、Video、ImageZoom、Tooltip、Mermaid — 这 12 个内置组件的覆盖面不输 Mintlify，超过了 VitePress 和基础 Nextra 的默认配置。

### 4. 轻量可控

整个框架代码量小，没有插件系统的抽象层，用户直接面对 Next.js + Tailwind 源码。对于想要深度定制的开发者来说，理解和修改成本远低于 Docusaurus 的插件体系。

---

## ezdoc 的差距

### 1. 内容层能力（最大差距）

| 能力 | Docusaurus | VitePress | Fumadocs | ezdoc |
|------|-----------|-----------|----------|-------|
| 版本化文档 | ✅ | ✅ | ✅ | ❌ |
| 文档标签/分类 | ✅ | ❌ | ✅ | ❌ |
| 上次更新时间 (git) | ✅ | ✅ | ✅ | ❌ |
| 自动生成 API 文档 | ✅(插件) | ❌ | ✅(插件) | ❌ |
| MDX 热重载 | ✅ | ✅ | ✅ | 依赖 Next.js |

版本化文档（v1/v2/v3 切换）是中大型项目的刚需，目前 ezdoc 没有这个能力。

### 2. 搜索体验

ezdoc 用 Pagefind，这是一个好选择（本地化、无第三方依赖），但有局限：
- 不支持中文分词（build 日志里也有提示）
- 没有 Algolia DocSearch 集成选项（Docusaurus/VitePress 都内置支持）
- 搜索结果无法按语言隔离（多语言场景下会混杂）

### 3. 插件/扩展体系

| 框架 | 扩展方式 |
|------|----------|
| Docusaurus | 插件系统 + 主题系统 + swizzle |
| VitePress | 主题扩展 + Vue 组件 |
| Fumadocs | Source providers + 组件覆盖 |
| ezdoc | 直接改源码 |

ezdoc 目前没有抽象的插件层。这既是优点（简单直接）也是缺点（无法通过 npm 安装第三方扩展，升级框架时用户定制会冲突）。

### 4. 导航与信息架构

- **缺少面包屑导航** — Docusaurus/Fumadocs 都有
- **缺少上下文关联**（"本页大纲"之外的"相关文档"推荐）
- **侧栏不支持多层嵌套** — 当前 NavGroup → NavItem 是两层结构，Docusaurus 支持无限嵌套分类
- **docs.json 手动维护** — 没有基于文件系统的自动排序（Fumadocs 支持 `_meta.json` 或文件名前缀排序）

### 5. i18n 成熟度

虽然有多语言路由和切换，但缺少：
- 翻译覆盖率提示（"本页尚未翻译，显示英文原文"）
- 翻译同步机制（源语言更新后标记其他语言过期）
- Crowdin/Weblate 等翻译平台集成

### 6. 开发者体验（DX）

- **没有 CLI 脚手架** — `create-docusaurus`、`create-fumadocs-app` 都有初始化命令
- **没有本地开发文档预览增强** — VitePress 的本地搜索、热重载体验非常丝滑
- **缺少配置校验** — ezdoc.config.ts 和 docs.json 没有 schema 校验，配置写错了静默失败

---

## 架构层面的关键差异

```
Docusaurus 思路：框架控制一切，用户通过插件/配置扩展
VitePress 思路：  约定大于配置，极致性能优先
Fumadocs 思路：  提供组件库 + source adapter，用户组装
ezdoc 思路：     提供完整可用的源码模板，用户直接修改
```

ezdoc 更接近一个 **"starter template"** 而非 **"framework"**。这不是贬义 — Mintlify 早期也是这个路线。但要成为真正的框架，需要在「用户定制」和「框架升级」之间建立边界。

---

## 演进路线

### P0 — 补齐内容层基础能力
- 侧栏多层嵌套（子分组/子目录）
- 面包屑导航
- 文档最后更新时间（读取 git log）

### P1 — 框架化封装
- 将 ezdoc 核心抽成 npm 包，用户项目只保留 `docs/`、`ezdoc.config.ts` 和覆盖的组件
- 提供 `create-ezdoc` CLI
- 配置文件 schema 校验（zod）

### P2 — 搜索增强
- 中文分词支持（jieba-wasm 或接入 Algolia）
- 搜索结果按当前语言过滤

### P3 — 内容管理增强
- 版本化文档支持
- 翻译覆盖率追踪
- 自动 API 文档生成（TypeDoc / OpenAPI）
