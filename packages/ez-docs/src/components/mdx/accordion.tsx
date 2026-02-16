import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  AccordionItem                                                      */
/* ------------------------------------------------------------------ */

interface AccordionItemProps {
  title: string;
  children: ReactNode;
}

export function AccordionItem({ title, children }: AccordionItemProps) {
  return (
    <details
      className={cn(
        "group border-b border-border",
        "[&:first-child]:border-t"
      )}
    >
      <summary
        className={cn(
          "flex cursor-pointer select-none items-center justify-between py-4 text-sm font-medium text-foreground",
          "transition-colors hover:text-primary",
          "[&::-webkit-details-marker]:hidden"
        )}
      >
        {title}
        <svg
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="pb-4 text-sm leading-relaxed text-foreground/80 [&>p]:mb-2 [&>p:last-child]:mb-0">
        {children}
      </div>
    </details>
  );
}

/* ------------------------------------------------------------------ */
/*  Accordion                                                          */
/* ------------------------------------------------------------------ */

interface AccordionProps {
  children: ReactNode;
}

export function Accordion({ children }: AccordionProps) {
  return <div className="my-6">{children}</div>;
}
