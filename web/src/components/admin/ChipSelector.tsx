"use client";

import { cn } from "@/lib/utils";

interface ChipSelectorProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: T[];
  labels: Record<T, string>;
  disabled?: boolean;
}

export function ChipSelector<T extends string>({
  value,
  onChange,
  options,
  labels,
  disabled,
}: ChipSelectorProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option)}
          className={cn(
            "px-3 py-1.5 text-sm rounded-full border transition-all",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
            value === option
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background hover:bg-accent hover:text-accent-foreground border-input hover:border-primary/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {labels[option]}
        </button>
      ))}
    </div>
  );
}
