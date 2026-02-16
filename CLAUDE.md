- 始终使用中文与用户交互

## 项目概述

ez-docs 是一个基于 Next.js 的文档框架，用户通过 `npm install ez-docs` 安装后即可使用。项目采用 monorepo 架构，核心框架和脚手架分为独立 npm 包。

- 项目性质：开源
- npm 包名：`ez-docs`（核心框架）、`create-ez-docs`（脚手架）
- CLI 命令名：`ezdoc`

## 技术栈

- 框架：Next.js 16 (App Router)，纯静态导出 (`output: 'export'`)
- 语言：TypeScript
- 样式：Tailwind CSS v4 + shadcn/ui (Radix UI)
- MDX 编译：next-mdx-remote
- 语法高亮：Shiki (rehype-pretty-code)
- 数学公式：remark-math + rehype-katex
- 图表：Mermaid.js（客户端渲染）
- 搜索：Pagefind（构建后生成索引）
- 多语言：自研 locale 路由 + 配置驱动
- 暗色模式：next-themes
- 包管理器：pnpm (monorepo workspace)
- 构建编排：Turborepo
- 测试：Vitest

## Monorepo 结构

```
ez-docs/
├── packages/
│   ├── ez-docs/          # 核心框架 npm 包
│   │   ├── src/          # 框架源码（app/, components/, lib/）
│   │   ├── cli/          # CLI 工具
│   │   └── tests/        # 单元测试
│   └── create-ez-docs/   # 脚手架（待实现）
├── website/              # dogfooding 文档站
│   ├── docs/             # 中英文文档
│   ├── ezdoc.config.ts   # 站点配置
│   └── src → ../packages/ez-docs/src  # 符号链接
└── project/              # 项目文档和规划
```

## 开发命令

- `cd website && pnpm dev` — 本地开发文档站
- `cd website && pnpm build` — 构建静态产物
- `cd website && pnpm ezdoc check` — 检查配置和文档
- `pnpm test --filter ez-docs` — 运行框架测试
- `pnpm build` — Turborepo 全量构建
