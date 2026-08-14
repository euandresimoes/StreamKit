import { Activity } from "lucide-react";
import { BaseDockPanel } from "@/components/base/BaseDockPanel";

export function LiveActivityPanel({ connected }: { connected: boolean }) {
  return (
    <BaseDockPanel
      panelId="live-activity"
      title="Atividade"
      icon={Activity}
      defaultSize={300}
      minSize={220}
      maxSize={560}
      resize="both"
    >
      <div className="flex h-full items-center justify-center p-4 text-center text-xs text-muted-foreground">
        {connected ? "Nenhum evento recente." : "Eventos da live aparecerão aqui."}
      </div>
    </BaseDockPanel>
  );
}
