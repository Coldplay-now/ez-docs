import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { COMPONENT_REGISTRY, buildResolveAlias } from "@/lib/component-registry";

describe("COMPONENT_REGISTRY", () => {
  it("应包含 mdx 和 layout 两个类别", () => {
    expect(COMPONENT_REGISTRY).toHaveProperty("mdx");
    expect(COMPONENT_REGISTRY).toHaveProperty("layout");
  });

  it("mdx 类别应包含 13 个组件", () => {
    expect(Object.keys(COMPONENT_REGISTRY.mdx)).toHaveLength(13);
  });

  it("layout 类别应包含 6 个组件", () => {
    expect(Object.keys(COMPONENT_REGISTRY.layout)).toHaveLength(6);
  });

  it("每个组件应有 exports 数组", () => {
    for (const [_, components] of Object.entries(COMPONENT_REGISTRY)) {
      for (const [name, meta] of Object.entries(components)) {
        expect(meta.exports).toBeInstanceOf(Array);
        expect(meta.exports.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("buildResolveAlias", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ezdoc-overrides-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("空 overrides 目录应返回空映射", () => {
    const alias = buildResolveAlias(tmpDir);
    expect(alias).toEqual({});
  });

  it("应检测 .tsx override 文件", () => {
    const mdxDir = path.join(tmpDir, "mdx");
    fs.mkdirSync(mdxDir);
    fs.writeFileSync(path.join(mdxDir, "callout.tsx"), "export const Callout = () => null;");

    const alias = buildResolveAlias(tmpDir);
    expect(alias).toHaveProperty("@/components/mdx/callout");
    expect(alias["@/components/mdx/callout"]).toBe(path.join(mdxDir, "callout"));
  });

  it("应检测 layout override 文件", () => {
    const layoutDir = path.join(tmpDir, "layout");
    fs.mkdirSync(layoutDir);
    fs.writeFileSync(path.join(layoutDir, "footer.tsx"), "export const Footer = () => null;");

    const alias = buildResolveAlias(tmpDir);
    expect(alias).toHaveProperty("@/components/layout/footer");
  });

  it("应忽略不在注册表中的文件", () => {
    const mdxDir = path.join(tmpDir, "mdx");
    fs.mkdirSync(mdxDir);
    fs.writeFileSync(path.join(mdxDir, "unknown-component.tsx"), "export default {}");

    const alias = buildResolveAlias(tmpDir);
    expect(Object.keys(alias)).toHaveLength(0);
  });

  it("应支持多种扩展名 (.ts, .jsx, .js)", () => {
    const mdxDir = path.join(tmpDir, "mdx");
    fs.mkdirSync(mdxDir);
    fs.writeFileSync(path.join(mdxDir, "badge.ts"), "export const Badge = {}");

    const alias = buildResolveAlias(tmpDir);
    expect(alias).toHaveProperty("@/components/mdx/badge");
  });
});
