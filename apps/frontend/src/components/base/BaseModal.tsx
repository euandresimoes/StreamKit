import { useEffect, type ReactNode } from "react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { GUIDE_CLOSE_MODALS_EVENT, useGuideOpen } from "@/modules/guide/guide-state";

export function BaseModal({
  children,
  description,
  open,
  onOpenChange,
  title,
  contentClassName,
  hideOverlay = false,
  modal = true,
}: {
  children: ReactNode;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  contentClassName?: string;
  hideOverlay?: boolean;
  modal?: boolean;
}) {
  const guideOpen = useGuideOpen();

  useEffect(() => {
    const close = () => onOpenChange(false);
    window.addEventListener(GUIDE_CLOSE_MODALS_EVENT, close);
    return () => window.removeEventListener(GUIDE_CLOSE_MODALS_EVENT, close);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={modal && !guideOpen}>
      <DialogContent
        onPointerDownOutside={(event) => {
          if (document.body.dataset["streamletGuideOpen"] === "true") {
            event.preventDefault();
          } else if (modal) {
            onOpenChange(false);
          }
        }}
        className={`glass-panel w-[min(860px,calc(100vw-1rem))] max-h-[calc(100vh-1rem)] gap-0 overflow-hidden rounded-3xl border-border-strong bg-popover/95 p-0 ${hideOverlay ? "z-[80]" : ""} ${contentClassName ?? ""}`}
        hideOverlay={hideOverlay}
      >
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
