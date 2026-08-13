import { Pencil } from "lucide-react";
import { useRef } from "react";

import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#14B8A6",
  "#06B6D4",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#D946EF",
  "#EC4899",
] as const;

type Props = { onChange(color: string): void; value: string | null };

export function BaseColorPicker({ onChange, value }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const normalized = value?.toUpperCase() ?? PRESET_COLORS[0];
  const customSelected = !PRESET_COLORS.includes(normalized as (typeof PRESET_COLORS)[number]);
  return (
    <div className="grid grid-cols-6 gap-2 rounded-2xl border border-border-strong bg-popover p-3 shadow-[var(--shadow-float)]">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={`Selecionar cor ${color}`}
          aria-pressed={normalized === color}
          onClick={() => onChange(color)}
          className={cn(
            "size-7 rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            normalized === color ? "border-foreground" : "border-transparent",
          )}
          style={{ backgroundColor: color }}
        />
      ))}
      <button
        type="button"
        aria-label="Escolher cor personalizada"
        aria-pressed={customSelected}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex size-7 items-center justify-center rounded-full border-2 text-white transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          customSelected ? "border-foreground" : "border-border-strong",
        )}
        style={{ backgroundColor: customSelected ? normalized : "var(--surface-2)" }}
      >
        <Pencil className="size-3.5 drop-shadow" />
        <input
          ref={inputRef}
          type="color"
          value={normalized}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="sr-only"
          tabIndex={-1}
        />
      </button>
    </div>
  );
}
