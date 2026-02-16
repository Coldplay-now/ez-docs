import { type ReactNode, Children, isValidElement, type ReactElement } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Step                                                               */
/* ------------------------------------------------------------------ */

interface StepProps {
  title: string;
  children: ReactNode;
}

export function Step({ children }: StepProps) {
  return <>{children}</>;
}

/* ------------------------------------------------------------------ */
/*  Steps                                                              */
/* ------------------------------------------------------------------ */

interface StepsProps {
  children: ReactNode;
}

export function Steps({ children }: StepsProps) {
  const items = Children.toArray(children).filter(
    (child): child is ReactElement<StepProps> =>
      isValidElement(child) && (child.type as unknown) === Step
  );

  if (items.length === 0) return null;

  return (
    <div className="my-6 ml-1 space-y-0">
      {items.map((item, index) => {
        const { title } = item.props;
        const isLast = index === items.length - 1;

        return (
          <div key={index} className="relative flex gap-4 pb-8 last:pb-0">
            {/* Vertical line */}
            {!isLast && (
              <div
                className="absolute left-[15px] top-[34px] bottom-0 w-px bg-border"
                aria-hidden="true"
              />
            )}

            {/* Step number circle */}
            <div
              className={cn(
                "relative z-10 flex size-[31px] shrink-0 items-center justify-center rounded-full",
                "border-2 border-primary bg-background text-xs font-bold text-primary"
              )}
            >
              {index + 1}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 pt-0.5">
              <h4 className="mb-2 text-base font-semibold text-foreground">
                {title}
              </h4>
              <div className="text-sm leading-relaxed text-foreground/80 [&>p]:mb-2 [&>p:last-child]:mb-0">
                {item.props.children}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
