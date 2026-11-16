"use client";

import { Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export const COLOR_OPTIONS = [
  "#1E88E5",
  "#43A047",
  "#E53935",
  "#FB8C00",
  "#8E24AA",
  "#00ACC1",
  "#D81B60",
  "#6D4C41",
  "#3949AB",
  "#757575",
] as const;

type ColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
  label?: string;
};

export function ColorPicker({
  value,
  onChange,
  label = "Cor",
}: ColorPickerProps) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {COLOR_OPTIONS.map((color) => {
        const selected = value.toLowerCase() === color.toLowerCase();
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={color}
            onClick={() => onChange(color)}
            className={cn(
              "focus-visible:ring-ring flex size-8 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              selected && "ring-foreground ring-2 ring-offset-2",
            )}
            style={{ backgroundColor: color }}
          >
            {selected && <Check className="size-4 text-white" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
