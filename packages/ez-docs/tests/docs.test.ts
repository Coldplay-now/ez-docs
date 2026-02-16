import { describe, it, expect } from "vitest";
import { extractToc, getBreadcrumbs, getPrevNext } from "@/lib/docs";
import { flattenNavigation, isNavItem } from "@/lib/nav-types";
import type { NavGroup, NavItem } from "@/lib/nav-types";

// ─── extractToc ──────────────────────────────────────────────

describe("extractToc", () => {
  it("应提取 h2-h4 标题", () => {
    const raw = `# H1 Title
## Getting Started
### Installation
#### Prerequisites
## Usage
`;
    const toc = extractToc(raw);
    expect(toc).toHaveLength(4);
    expect(toc[0]).toEqual({ depth: 2, text: "Getting Started", id: "getting-started" });
    expect(toc[1]).toEqual({ depth: 3, text: "Installation", id: "installation" });
    expect(toc[2]).toEqual({ depth: 4, text: "Prerequisites", id: "prerequisites" });
    expect(toc[3]).toEqual({ depth: 2, text: "Usage", id: "usage" });
  });

  it("应跳过围栏代码块中的标题", () => {
    const raw = `## Real Title

\`\`\`markdown
## Not A Title
\`\`\`

## Another Real Title
`;
    const toc = extractToc(raw);
    expect(toc).toHaveLength(2);
    expect(toc[0].text).toBe("Real Title");
    expect(toc[1].text).toBe("Another Real Title");
  });

  it("应跳过缩进代码块中的标题", () => {
    const raw = `## Real Title

    ## Indented Not A Title

\t## Tab Indented Not A Title

## Another Real Title
`;
    const toc = extractToc(raw);
    expect(toc).toHaveLength(2);
    expect(toc[0].text).toBe("Real Title");
    expect(toc[1].text).toBe("Another Real Title");
  });

  it("应正确生成中文标题 id", () => {
    const raw = `## 快速开始
### 安装指南
`;
    const toc = extractToc(raw);
    expect(toc[0].id).toBe("快速开始");
    expect(toc[1].id).toBe("安装指南");
  });

  it("应处理空内容", () => {
    const toc = extractToc("");
    expect(toc).toEqual([]);
  });

  it("不应提取 h1 和 h5+", () => {
    const raw = `# H1
##### H5
###### H6
`;
    const toc = extractToc(raw);
    expect(toc).toEqual([]);
  });
});

// ─── nav-types 工具函数 ──────────────────────────────────────

describe("nav-types", () => {
  const sampleNav: NavGroup[] = [
    {
      group: "入门",
      pages: [
        { title: "快速开始", path: "getting-started" },
        { title: "安装", path: "installation" },
      ],
    },
    {
      group: "指南",
      pages: [
        { title: "配置", path: "guide/config" },
        {
          group: "高级",
          pages: [
            { title: "插件", path: "guide/plugins" },
            { title: "主题", path: "guide/themes" },
          ],
        },
      ],
    },
  ];

  describe("isNavItem", () => {
    it("应识别 NavItem (有 path)", () => {
      expect(isNavItem({ title: "Test", path: "test" })).toBe(true);
    });

    it("应识别 NavGroup (有 group)", () => {
      expect(isNavItem({ group: "Test", pages: [] })).toBe(false);
    });
  });

  describe("flattenNavigation", () => {
    it("应将嵌套导航扁平化为有序 NavItem 列表", () => {
      const flat = flattenNavigation(sampleNav);
      expect(flat).toHaveLength(5);
      expect(flat.map((i) => i.path)).toEqual([
        "getting-started",
        "installation",
        "guide/config",
        "guide/plugins",
        "guide/themes",
      ]);
    });

    it("应处理空导航", () => {
      expect(flattenNavigation([])).toEqual([]);
    });
  });

  describe("getPrevNext", () => {
    it("应找到前一页和后一页", () => {
      const { prev, next } = getPrevNext("installation", sampleNav);
      expect(prev?.path).toBe("getting-started");
      expect(next?.path).toBe("guide/config");
    });

    it("第一页应无 prev", () => {
      const { prev, next } = getPrevNext("getting-started", sampleNav);
      expect(prev).toBeNull();
      expect(next?.path).toBe("installation");
    });

    it("最后一页应无 next", () => {
      const { prev, next } = getPrevNext("guide/themes", sampleNav);
      expect(prev?.path).toBe("guide/plugins");
      expect(next).toBeNull();
    });

    it("不存在的 slug 应返回 null", () => {
      const { prev, next } = getPrevNext("nonexistent", sampleNav);
      expect(prev).toBeNull();
      expect(next).toBeNull();
    });
  });

  describe("getBreadcrumbs", () => {
    it("应为顶级页面生成面包屑", () => {
      const crumbs = getBreadcrumbs("getting-started", sampleNav, "zh");
      expect(crumbs.length).toBeGreaterThanOrEqual(2);
      expect(crumbs[0].label).toBe("文档");
      expect(crumbs[crumbs.length - 1].label).toBe("快速开始");
    });

    it("应为嵌套页面生成含分组的面包屑", () => {
      const crumbs = getBreadcrumbs("guide/plugins", sampleNav, "zh");
      expect(crumbs.length).toBeGreaterThanOrEqual(3);
      expect(crumbs[0].label).toBe("文档");
      // 应包含分组信息
      const labels = crumbs.map((c) => c.label);
      expect(labels).toContain("指南");
      expect(labels).toContain("高级");
    });

    it("不存在的 slug 应回退", () => {
      const crumbs = getBreadcrumbs("nonexistent", sampleNav, "zh");
      expect(crumbs.length).toBeGreaterThanOrEqual(1);
      expect(crumbs[0].label).toBe("文档");
    });
  });
});
