import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function BaseTag({
  children,
  onRemove,
  className,
}: {
  children: ReactNode;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground",
        className,
      )}
    >
      {children}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="Remover etiqueta">
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}
