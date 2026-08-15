import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BaseResizablePanel } from "@/components/base/BaseResizablePanel";
import { useLiveSelection } from "@/modules/live-control/use-live-control";
import { LivePreview } from "./LivePreview";
import { LiveChatPanel } from "./LiveChatPanel";

export function LiveControlTab() {
  const live = useLiveSelection();
  const selected = live.selected;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-4 border-b border-border px-5 py-2">
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden border-l border-border pl-3 sm:block">
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Status</p>
            <p className="text-xs font-semibold">{selected?.state ?? "offline"}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Atualizar controle da live"
            onClick={() => void live.load()}
          >
            <RefreshCw />
          </Button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">
        {live.error && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {live.error}
          </div>
        )}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 min-w-0 flex-1">
              <LivePreview stream={selected} />
            </div>
          </div>
          <BaseResizablePanel
            panelId="live-chat"
            mode="vertical"
            resize="left"
            defaultSize={360}
            minSize={280}
            maxSize={620}
            className="shrink-0 border-l border-border"
          >
            <LiveChatPanel stream={selected} />
          </BaseResizablePanel>
        </div>
      </div>
    </div>
  );
}
