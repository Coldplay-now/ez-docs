# MDX 是什么？与 Markdown 有什么不同？

## Markdown 简介

Markdown（`.md`）是一种轻量级标记语言，用纯文本编写，通过简单的符号表达格式。广泛用于 README、技术文档、博客等场景。

```markdown
# 标题
**加粗** 和 *斜体*
- 列表项
[链接](https://example.com)
```

它的优势是**简单、通用、零构建**——GitHub、VS Code、各种静态站点生成器都原生支持。

---

## MDX 简介

MDX（`.mdx`）= **Markdown + JSX**。它是 Markdown 的超集，在保留所有 Markdown 语法的基础上，允许你直接嵌入 React 组件和 JavaScript 表达式。

```mdx
import { Chart } from './components/Chart'

# 销售报告

下面是本季度的数据可视化：

<Chart data={salesData} type="bar" />

总计：{salesData.reduce((a, b) => a + b, 0)} 万元
```

---

## 核心区别

| 特性 | Markdown (`.md`) | MDX (`.mdx`) |
|------|------------------|--------------|
| 基本格式（标题、列表、加粗等） | ✅ | ✅ |
| 嵌入 React/JSX 组件 | ❌ | ✅ |
| JavaScript 表达式 | ❌ | ✅ `{1 + 1}` |
| import / export 语句 | ❌ | ✅ |
| 需要构建工具 | 否 | 是（Next.js、Gatsby 等） |
| HTML 标签 | 支持 | 被 JSX 替代 |
| 交互性 | 纯静态 | 可嵌入交互组件 |
| 学习成本 | 低 | 中（需了解 React） |

---

## MDX 语法要点

### 1. 导入和使用组件

```mdx
import { Button } from './components/Button'
import { Callout } from './components/Callout'

# 快速开始

<Callout type="warning">
  请先安装依赖再继续。
</Callout>

<Button onClick={() => alert('clicked!')}>点击我</Button>
```

### 2. JavaScript 表达式

```mdx
圆周率是：{Math.PI.toFixed(4)}

当前年份：{new Date().getFullYear()}
```

### 3. Markdown 与 JSX 混合使用

```mdx
<section>
  这里可以使用 **Markdown 语法**，包括 *斜体* 和 `代码`。
</section>
```

### 4. 导出数据

```mdx
export const meta = {
  title: '我的文章',
  author: 'xt',
  date: '2026-02-15'
}

# {meta.title}

作者：{meta.author}
```

---

## MDX 与 Markdown 的语法差异

MDX 并非 100% 兼容 Markdown，有几个需要注意的地方：

- **缩进代码块不生效**——MDX 保留缩进给 JSX 组件使用，代码块请用 ` ``` ` 围栏语法
- **HTML 被 JSX 替代**——需要写自闭合标签，如 `<img />` 而非 `<img>`，`<br />` 而非 `<br>`
- **花括号 `{}` 和尖括号 `<>` 需要转义**——除非你是在写 JSX 表达式
- **不支持自动链接**——`<https://example.com>` 语法不可用，会和 JSX 标签冲突

---

## 什么时候用 Markdown？

- README 文件
- 纯文本文档、API 文档
- 静态博客和文章
- 不需要构建工具的场景

## 什么时候用 MDX？

- 需要嵌入交互组件（图表、表单、动画等）
- 基于 React 的文档站点（Docusaurus、Next.js 等）
- 内容中需要动态数据或逻辑
- 组件化的设计系统文档

---

## 常见的 MDX 生态工具

- **[Next.js](https://nextjs.org/)** — 通过 `@next/mdx` 插件支持
- **[Docusaurus](https://docusaurus.io/)** — 默认支持 MDX
- **[Gatsby](https://www.gatsbyjs.com/)** — 通过 `gatsby-plugin-mdx` 支持
- **[Astro](https://astro.build/)** — 原生支持 MDX
- **[mdx-bundler](https://github.com/kentcdodds/mdx-bundler)** — 独立的 MDX 编译打包工具

---

## 总结

Markdown 是写文档的事实标准，简单可靠。MDX 在此基础上引入了组件和交互能力，适合需要丰富展示效果的现代文档和内容站点。如果你的项目已经使用 React 技术栈，MDX 是一个很自然的选择。
