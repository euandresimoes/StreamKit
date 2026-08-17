import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SegmentedControlOption<T extends string> = {
  icon?: ReactNode;
  label: string;
  value: T;
};

type BaseSegmentedControlProps<T extends string> = {
  ariaLabel: string;
  disabled?: boolean;
  onChange(value: T): void;
  options: readonly SegmentedControlOption<T>[];
  value: T;
};

export function BaseSegmentedControl<T extends string>({
  ariaLabel,
  disabled = false,
  onChange,
  options,
  value,
}: BaseSegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-disabled={disabled}
      className="grid grid-flow-col gap-1 rounded-xl border border-border bg-surface-2 p-0.5"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex h-7 min-w-0 items-center justify-center gap-1.5 rounded-lg border px-2 py-0 text-xs outline-none transition-[background-color,border-color,color,box-shadow]",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              "disabled:cursor-not-allowed disabled:opacity-50",
              selected
                ? "border-border-strong bg-card text-foreground shadow-sm"
                : "border-transparent bg-transparent text-muted-foreground hover:bg-card/50 hover:text-foreground",
            )}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
