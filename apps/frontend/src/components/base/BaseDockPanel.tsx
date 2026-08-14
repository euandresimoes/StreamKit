import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { BaseResizablePanel } from "./BaseResizablePanel";

export function BaseDockPanel({
  children,
  className = "",
  defaultSize,
  icon: Icon,
  maxSize = 900,
  minSize = 220,
  panelId,
  resize = "right",
  title,
}: {
  children: ReactNode;
  className?: string;
  defaultSize: number;
  icon?: LucideIcon;
  maxSize?: number;
  minSize?: number;
  panelId: string;
  resize?: "left" | "right";
  title: string;
}) {
  return (
    <BaseResizablePanel
      panelId={panelId}
      mode="vertical"
      resize={resize}
      defaultSize={defaultSize}
      minSize={minSize}
      maxSize={maxSize}
      className={`shrink-0 border-l border-border bg-card ${className}`}
    >
      <header className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3 text-xs font-semibold">
        {Icon && <Icon className="size-3.5 text-muted-foreground" />}
        {title}
      </header>
      <div className="min-h-0 min-w-0 flex-1 overflow-auto">{children}</div>
    </BaseResizablePanel>
  );
}
