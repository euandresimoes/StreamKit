import { cn } from "@/lib/utils";

const styles = {
  low: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  normal: "border-border bg-muted/40 text-muted-foreground",
  high: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  urgent: "border-red-400/30 bg-red-400/10 text-red-300",
} as const;

export function BasePriorityBadge({ priority }: { priority: keyof typeof styles }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        styles[priority],
      )}
    >
      {priority}
    </span>
  );
}
