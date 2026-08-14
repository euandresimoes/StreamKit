import type { ReactNode } from "react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function BaseModal({
  children,
  description,
  open,
  onOpenChange,
  title,
}: {
  children: ReactNode;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel max-h-[88vh] max-w-[860px] gap-0 overflow-hidden rounded-3xl border-border-strong bg-popover/95 p-0">
        <header className="border-b border-border px-6 py-4 pr-12">
          <DialogTitle className="text-[15px] font-semibold">{title}</DialogTitle>
          {description && (
            <DialogDescription className="mt-1 text-[11px]">{description}</DialogDescription>
          )}
        </header>
        <section className="min-h-0 overflow-y-auto p-6">{children}</section>
      </DialogContent>
    </Dialog>
  );
}
