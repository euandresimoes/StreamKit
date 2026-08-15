import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BaseDockPanel } from "@/components/base/BaseDockPanel";

export function LiveQuickControlsPanel({ connected }: { connected: boolean }) {
  return (
    <BaseDockPanel panelId="live-quick-controls" title="Quick controls" icon={SlidersHorizontal}>
      <div className="grid w-full content-start gap-2 p-3">
        <Button size="sm" variant="outline" disabled={!connected}>
          Start stream
        </Button>
        <Button size="sm" variant="outline" disabled={!connected}>
          Atualizar dados
        </Button>
        <p className="text-[10px] text-muted-foreground">
          {connected
            ? "Actions available for the connected provider."
            : "Connect a platform to enable actions."}
        </p>
      </div>
    </BaseDockPanel>
  );
}
