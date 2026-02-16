import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TreeNode {
  name: string;
  isFolder: boolean;
  children: TreeNode[];
}

/** JSON input format: nested arrays like ["folder/", ["child.txt"]] */
type TreeInput = (string | TreeInput)[];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Recursively extract plain text from React children. */
function extractText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return extractText(
      (node as { props: { children?: ReactNode } }).props.children
    );
  }
  return "";
}

/* ------------------------------------------------------------------ */
/*  Parsers                                                            */
/* ------------------------------------------------------------------ */

function parseJsonTree(items: TreeInput): TreeNode[] {
  const result: TreeNode[] = [];
  let i = 0;

  while (i < items.length) {
    const item = items[i];
    if (typeof item === "string") {
      const isFolder = item.endsWith("/");
      const name = isFolder ? item.slice(0, -1) : item;
      const node: TreeNode = { name, isFolder, children: [] };

      if (isFolder && i + 1 < items.length && Array.isArray(items[i + 1])) {
        node.children = parseJsonTree(items[i + 1] as TreeInput);
        i += 2;
      } else {
        i += 1;
      }
      result.push(node);
    } else {
      i += 1;
    }
  }
  return result;
}

function parseTreeText(text: string): TreeNode[] {
  const lines = text.split("\n").filter((l) => l.trim());
  const root: TreeNode[] = [];
  const stack: { indent: number; children: TreeNode[] }[] = [
    { indent: -1, children: root },
  ];

  for (const line of lines) {
    const name = line.trim();
    if (!name) continue;

    const indent = line.search(/\S/);
    const isFolder = name.endsWith("/");
    const cleanName = isFolder ? name.slice(0, -1) : name;
    const node: TreeNode = { name: cleanName, isFolder, children: [] };

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    stack[stack.length - 1].children.push(node);

    if (isFolder) {
      stack.push({ indent, children: node.children });
    }
  }
  return root;
}

/* ------------------------------------------------------------------ */
/*  TreeItem renderer                                                  */
/* ------------------------------------------------------------------ */

function TreeItem({ node, depth }: { node: TreeNode; depth: number }) {
  return (
    <li className="list-none">
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-sm px-1 py-0.5 text-sm",
          "hover:bg-muted/50"
        )}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
      >
        {node.isFolder ? (
          <svg
            className="size-4 shrink-0 text-primary"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
          </svg>
        ) : (
          <svg
            className="size-4 shrink-0 text-muted-foreground"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          </svg>
        )}
        <span
          className={cn(
            "font-mono text-[13px]",
            node.isFolder
              ? "font-medium text-foreground"
              : "text-foreground/80"
          )}
        >
          {node.name}
        </span>
      </div>
      {node.children.length > 0 && (
        <ul className="m-0 p-0">
          {node.children.map((child) => (
            <TreeItem key={child.name} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/*  FileTree component                                                 */
/* ------------------------------------------------------------------ */

interface FileTreeProps {
  /**
   * JSON string describing the tree. Format:
   * '["folder/", ["child.txt", "subfolder/", ["nested.ts"]], "root-file.txt"]'
   * Folders end with "/", followed by an array of children.
   */
  json?: string;
  children?: ReactNode;
}

export function FileTree({ json, children }: FileTreeProps) {
  let nodes: TreeNode[];

  if (json) {
    // Parse JSON string prop (MDX only supports static string attributes)
    try {
      const parsed = JSON.parse(json) as TreeInput;
      nodes = parseJsonTree(parsed);
    } catch {
      nodes = [];
    }
  } else {
    // Fallback: extract text from children
    let text = "";
    if (typeof children === "string") {
      text = children;
    } else if (Array.isArray(children)) {
      text = children
        .map((c) => (typeof c === "string" ? c : extractText(c)))
        .join("");
    } else if (children) {
      text = extractText(children);
    }

    const trimmed = text.trim();
    if (trimmed.startsWith("[")) {
      try {
        nodes = parseJsonTree(JSON.parse(trimmed) as TreeInput);
      } catch {
        nodes = parseTreeText(text);
      }
    } else {
      nodes = parseTreeText(text);
    }
  }

  return (
    <div className="my-6 overflow-hidden rounded-lg border border-border bg-muted/20">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2">
        <svg
          className="size-4 text-muted-foreground"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
        </svg>
        <span className="text-xs font-medium text-muted-foreground">
          File Tree
        </span>
      </div>
      <ul className="m-0 p-2">
        {nodes.map((node) => (
          <TreeItem key={node.name} node={node} depth={0} />
        ))}
      </ul>
    </div>
  );
}
