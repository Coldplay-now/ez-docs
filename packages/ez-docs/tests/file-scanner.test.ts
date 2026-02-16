import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { scanMarkdownFiles } from "@/lib/file-scanner";

describe("scanMarkdownFiles", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ezdoc-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("应扫描 .md 和 .mdx 文件", () => {
    fs.writeFileSync(path.join(tmpDir, "hello.md"), "# Hello");
    fs.writeFileSync(path.join(tmpDir, "world.mdx"), "# World");

    const slugs = scanMarkdownFiles(tmpDir);
    expect(slugs.sort()).toEqual(["hello", "world"]);
  });

  it("应递归扫描子目录", () => {
    const subDir = path.join(tmpDir, "guide");
    fs.mkdirSync(subDir);
    fs.writeFileSync(path.join(subDir, "intro.mdx"), "# Intro");
    fs.writeFileSync(path.join(tmpDir, "index.md"), "# Index");

    const slugs = scanMarkdownFiles(tmpDir);
    expect(slugs.sort()).toEqual(["guide/intro", "index"]);
  });

  it("应忽略非 markdown 文件", () => {
    fs.writeFileSync(path.join(tmpDir, "readme.txt"), "text");
    fs.writeFileSync(path.join(tmpDir, "data.json"), "{}");
    fs.writeFileSync(path.join(tmpDir, "doc.md"), "# Doc");

    const slugs = scanMarkdownFiles(tmpDir);
    expect(slugs).toEqual(["doc"]);
  });

  it("不存在的目录应返回空数组", () => {
    const slugs = scanMarkdownFiles("/nonexistent/path/abc123");
    expect(slugs).toEqual([]);
  });

  it("空目录应返回空数组", () => {
    const slugs = scanMarkdownFiles(tmpDir);
    expect(slugs).toEqual([]);
  });

  it("应处理深层嵌套目录", () => {
    const deep = path.join(tmpDir, "a", "b", "c");
    fs.mkdirSync(deep, { recursive: true });
    fs.writeFileSync(path.join(deep, "deep.mdx"), "# Deep");

    const slugs = scanMarkdownFiles(tmpDir);
    expect(slugs).toEqual(["a/b/c/deep"]);
  });
});
