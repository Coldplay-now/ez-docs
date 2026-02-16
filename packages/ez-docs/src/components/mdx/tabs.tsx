"use client";

import {
  type ReactNode,
  type ReactElement,
  useState,
  Children,
  isValidElement,
} from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  TabItem                                                           */
/* ------------------------------------------------------------------ */

interface TabItemProps {
  /** Label displayed on the tab button. */
  label: string;
  /** Unique value used to identify this tab. */
  value: string;
  children: ReactNode;
}

export function TabItem({ children }: TabItemProps) {
  // Rendering is handled by the parent <Tabs>; TabItem only carries props.
  return <>{children}</>;
}

/* ------------------------------------------------------------------ */
/*  Tabs                                                              */
/* ------------------------------------------------------------------ */

interface TabsProps {
  /** The `value` of the initially active tab. Defaults to the first tab. */
  defaultValue?: string;
  children: ReactNode;
}

export function Tabs({ defaultValue, children }: TabsProps) {
  // Collect TabItem children and their props.
  const items = Children.toArray(children).filter(
    (child): child is ReactElement<TabItemProps> =>
      isValidElement(child) && (child.type as unknown) === TabItem
  );

  const firstValue = items[0]?.props.value ?? "";
  const [active, setActive] = useState(defaultValue ?? firstValue);

  if (items.length === 0) return null;

  return (
    <div className="my-6">
      {/* Tab buttons */}
      <div
        className={cn(
          "flex gap-1 border-b border-border"
        )}
        role="tablist"
      >
        {items.map((item) => {
          const { label, value } = item.props;
          const isActive = value === active;

          return (
            <button
              key={value}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(value)}
              className={cn(
                "relative px-3.5 pb-2.5 pt-2 text-sm font-medium transition-colors",
                "outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:rounded-sm",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
              {/* Active underline indicator */}
              {isActive && (
                <span
                  className={cn(
                    "absolute inset-x-0 -bottom-px h-0.5 rounded-full",
                    "bg-foreground"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab panels — hidden via CSS to preserve DOM for SEO */}
      <div className="mt-4">
        {items.map((item) => {
          const { value } = item.props;
          const isActive = value === active;

          return (
            <div
              key={value}
              role="tabpanel"
              aria-hidden={!isActive}
              style={{ display: isActive ? undefined : "none" }}
              className="text-sm leading-relaxed text-foreground/90"
            >
              {item.props.children}
            </div>
          );
        })}
      </div>
    </div>
  );
}
