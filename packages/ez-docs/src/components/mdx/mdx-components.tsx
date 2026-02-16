import type { ComponentPropsWithoutRef, ReactNode, ReactElement } from "react";
import Link from "next/link";
import { Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Mermaid } from "./mermaid";
import { CodePre } from "./code-pre";

// ---------------------------------------------------------------------------
// Built-in custom MDX components
// ---------------------------------------------------------------------------
import { Callout } from "./callout";
import { Tabs, TabItem } from "./tabs";
import { Steps, Step } from "./steps";
import { Card, CardGroup } from "./card";
import { Accordion, AccordionItem } from "./accordion";
import { FileTree } from "./file-tree";
import { Badge } from "./badge";
import { Video } from "./video";
import { ImageZoom } from "./image-zoom";
import { Tooltip } from "./tooltip";
import { CodeGroup } from "./code-group";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Determine whether a URL points to an external site. */
function isExternalUrl(href: string): boolean {
  return /^https?:\/\//.test(href) || href.startsWith("//");
}

/**
 * Slugify children text for heading id generation.
 * rehype-slug already handles this at build time, but we keep a runtime
 * fallback so the component works even when used standalone.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u4e00-\u9fff-]/g, "");
}

/** Recursively extract plain text from React children. */
function extractText(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (children && typeof children === "object" && "props" in children) {
    return extractText((children as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

// ---------------------------------------------------------------------------
// Heading (h1 - h6) with anchor link
// ---------------------------------------------------------------------------

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

const headingStyles: Record<HeadingTag, string> = {
  h1: "text-3xl sm:text-4xl font-bold tracking-tight mt-2 mb-6",
  h2: "text-2xl sm:text-3xl font-semibold tracking-tight mt-12 mb-4 border-b border-border pb-2",
  h3: "text-xl sm:text-2xl font-semibold tracking-tight mt-8 mb-3",
  h4: "text-lg font-semibold tracking-tight mt-6 mb-2",
  h5: "text-base font-semibold tracking-tight mt-4 mb-1",
  h6: "text-sm font-semibold tracking-tight mt-4 mb-1 text-muted-foreground",
};

function createHeading(tag: HeadingTag) {
  const Tag = tag;
  const style = headingStyles[tag];

  function Heading({
    id,
    className,
    children,
    ...props
  }: ComponentPropsWithoutRef<typeof Tag>) {
    // Prefer the id provided by rehype-slug; fall back to runtime slugify
    const headingId = id ?? slugify(extractText(children));

    return (
      <Tag
        id={headingId}
        className={cn("group scroll-mt-24 text-foreground", style, className)}
        {...props}
      >
        <a
          href={`#${headingId}`}
          className="no-underline hover:no-underline inline-flex items-center gap-1"
          aria-label={`Link to ${extractText(children)}`}
        >
          {children}
          <LinkIcon
            className="ml-1 size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-60"
            aria-hidden="true"
          />
        </a>
      </Tag>
    );
  }

  Heading.displayName = Tag.toUpperCase();
  return Heading;
}

// ---------------------------------------------------------------------------
// Paragraph
// ---------------------------------------------------------------------------

function P({ className, ...props }: ComponentPropsWithoutRef<"p">) {
  return (
    <p
      className={cn(
        "leading-7 text-foreground/90 [&:not(:first-child)]:mt-4",
        className,
      )}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Anchor
// ---------------------------------------------------------------------------

function A({
  href = "#",
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"a">) {
  const external = isExternalUrl(href);

  const sharedClasses = cn(
    "font-medium text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary/80 transition-colors",
    className,
  );

  if (external) {
    return (
      <a
        href={href}
        className={sharedClasses}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={sharedClasses} {...props}>
      {children}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

function UL({ className, ...props }: ComponentPropsWithoutRef<"ul">) {
  return (
    <ul
      className={cn("my-4 ml-6 list-disc space-y-2 text-foreground/90", className)}
      {...props}
    />
  );
}

function OL({ className, ...props }: ComponentPropsWithoutRef<"ol">) {
  return (
    <ol
      className={cn("my-4 ml-6 list-decimal space-y-2 text-foreground/90", className)}
      {...props}
    />
  );
}

function LI({ className, ...props }: ComponentPropsWithoutRef<"li">) {
  return (
    <li
      className={cn("leading-7 marker:text-muted-foreground", className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Blockquote
// ---------------------------------------------------------------------------

function Blockquote({ className, ...props }: ComponentPropsWithoutRef<"blockquote">) {
  return (
    <blockquote
      className={cn(
        "my-6 border-l-4 border-primary/30 bg-muted/40 py-3 pl-5 pr-4 text-foreground/80 [&>p]:mt-0",
        className,
      )}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Table (responsive)
// ---------------------------------------------------------------------------

function Table({ className, ...props }: ComponentPropsWithoutRef<"table">) {
  return (
    <div className="my-6 w-full overflow-x-auto rounded-lg border border-border">
      <table
        className={cn("w-full text-sm border-collapse", className)}
        {...props}
      />
    </div>
  );
}

function Thead({ className, ...props }: ComponentPropsWithoutRef<"thead">) {
  return <thead className={cn("bg-muted/50", className)} {...props} />;
}

function Tbody({ className, ...props }: ComponentPropsWithoutRef<"tbody">) {
  return (
    <tbody
      className={cn("[&>tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function Tr({ className, ...props }: ComponentPropsWithoutRef<"tr">) {
  return (
    <tr
      className={cn(
        "border-b border-border transition-colors hover:bg-muted/30",
        className,
      )}
      {...props}
    />
  );
}

function Th({ className, ...props }: ComponentPropsWithoutRef<"th">) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function Td({ className, ...props }: ComponentPropsWithoutRef<"td">) {
  return (
    <td
      className={cn("px-4 py-3 text-foreground/90 align-top", className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Code (pre + code)
//
// rehype-pretty-code generates the syntax-highlighted markup, so these
// components are only responsible for the outer container styling.
//
// rehype-pretty-code adds data-* attributes:
//   <pre>  -> data-theme  (on the <pre> wrapping each code block)
//   <code> -> data-line-numbers, data-language, etc.
// Inline code: <code> without a wrapping <pre> (no data-language attr)
//
// Special case: ```mermaid code blocks are routed to the <Mermaid> client
// component instead of rendering as a normal code block.
// ---------------------------------------------------------------------------

function Pre({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"pre"> & { "data-language"?: string }) {
  // Detect ```mermaid code blocks and route to the Mermaid renderer.
  // Check both data-language (set by rehype-pretty-code) and child className
  // (language-mermaid from MDX compiler) in a single pass.
  const dataLang = props["data-language"];
  const childEl =
    children && typeof children === "object" && "props" in children
      ? (children as ReactElement<{ className?: string; children?: ReactNode }>)
      : null;
  const isMermaid =
    dataLang === "mermaid" ||
    (childEl?.props?.className ?? "").includes("language-mermaid");

  if (isMermaid) {
    const chart = extractText(childEl?.props?.children ?? children);
    return <Mermaid chart={chart} />;
  }

  // Delegate to client component for language tag + copy button
  return (
    <CodePre language={dataLang} className={className} {...props}>
      {children}
    </CodePre>
  );
}

function Code({
  className,
  ...props
}: ComponentPropsWithoutRef<"code"> & { "data-language"?: string }) {
  // Block code inside <pre>: rehype-pretty-code sets data-language on <code>.
  // Also check className for the classic language-* pattern.
  const isBlockCode =
    props["data-language"] || className?.includes("language-");

  if (isBlockCode) {
    return (
      <code
        className={cn("grid font-mono text-[0.875em]", className)}
        {...props}
      />
    );
  }

  // Inline code: styled with background + border
  return (
    <code
      className={cn(
        "relative rounded-md border border-border bg-muted/60 px-[0.4em] py-[0.2em] font-mono text-[0.875em] text-foreground",
        className,
      )}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Figure (rehype-pretty-code wraps code blocks in <figure>)
// ---------------------------------------------------------------------------

function Figure({ className, ...props }: ComponentPropsWithoutRef<"figure">) {
  return (
    <figure
      className={cn("m-0 not-prose", className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Image
// ---------------------------------------------------------------------------

function Img({ className, alt, ...props }: ComponentPropsWithoutRef<"img">) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={cn("my-6 rounded-lg border border-border", className)}
      alt={alt ?? ""}
      loading="lazy"
      decoding="async"
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Horizontal Rule
// ---------------------------------------------------------------------------

function Hr({ className, ...props }: ComponentPropsWithoutRef<"hr">) {
  return <hr className={cn("my-8 border-border", className)} {...props} />;
}

// ---------------------------------------------------------------------------
// Inline text
// ---------------------------------------------------------------------------

function Strong({ className, ...props }: ComponentPropsWithoutRef<"strong">) {
  return (
    <strong
      className={cn("font-semibold text-foreground", className)}
      {...props}
    />
  );
}

function Em({ className, ...props }: ComponentPropsWithoutRef<"em">) {
  return <em className={cn("italic text-foreground/90", className)} {...props} />;
}

// ---------------------------------------------------------------------------
// Component map
// ---------------------------------------------------------------------------

export const components = {
  h1: createHeading("h1"),
  h2: createHeading("h2"),
  h3: createHeading("h3"),
  h4: createHeading("h4"),
  h5: createHeading("h5"),
  h6: createHeading("h6"),
  p: P,
  a: A,
  ul: UL,
  ol: OL,
  li: LI,
  blockquote: Blockquote,
  table: Table,
  thead: Thead,
  tbody: Tbody,
  tr: Tr,
  th: Th,
  td: Td,
  pre: Pre,
  code: Code,
  figure: Figure,
  img: Img,
  hr: Hr,
  strong: Strong,
  em: Em,
  // ── Built-in custom components ──
  Callout,
  Tabs,
  TabItem,
  // ── Extended components ──
  Steps,
  Step,
  Card,
  CardGroup,
  Accordion,
  AccordionItem,
  FileTree,
  Badge,
  Video,
  ImageZoom,
  Tooltip,
  CodeGroup,
};
