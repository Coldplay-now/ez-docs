import { type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Card                                                               */
/* ------------------------------------------------------------------ */

interface CardProps {
  title: string;
  icon?: string;
  href?: string;
  children: ReactNode;
}

export function Card({ title, icon, href, children }: CardProps) {
  const content = (
    <>
      {icon && <span className="mb-2 block text-2xl">{icon}</span>}
      <h4 className="mb-1 text-sm font-semibold text-foreground">{title}</h4>
      <div className="text-sm leading-relaxed text-muted-foreground [&>p]:mb-0">
        {children}
      </div>
    </>
  );

  const baseClasses = cn(
    "flex flex-col rounded-lg border border-border p-4 transition-colors",
    href && "hover:border-primary/40 hover:bg-muted/50"
  );

  if (href) {
    const isExternal = /^https?:\/\//.test(href);
    if (isExternal) {
      return (
        <a
          href={href}
          className={baseClasses}
          target="_blank"
          rel="noopener noreferrer"
        >
          {content}
        </a>
      );
    }
    return (
      <Link href={href} className={baseClasses}>
        {content}
      </Link>
    );
  }

  return <div className={baseClasses}>{content}</div>;
}

/* ------------------------------------------------------------------ */
/*  CardGroup                                                          */
/* ------------------------------------------------------------------ */

interface CardGroupProps {
  cols?: 2 | 3 | 4;
  children: ReactNode;
}

const colsClass: Record<number, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

export function CardGroup({ cols = 2, children }: CardGroupProps) {
  return (
    <div className={cn("my-6 grid gap-4", colsClass[cols] ?? colsClass[2])}>
      {children}
    </div>
  );
}
