import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BaseDockPanel } from "@/components/base/BaseDockPanel";

export function LiveQuickControlsPanel({ connected }: { connected: boolean }) {
  return (
    <BaseDockPanel
      panelId="live-quick-controls"
      title="Controles rápidos"
      icon={SlidersHorizontal}
      defaultSize={300}
      resize="right"
    >
      <div className="grid content-start gap-2 p-3">
        <Button size="sm" variant="outline" disabled={!connected}>
          Iniciar transmissão
        </Button>
        <Button size="sm" variant="outline" disabled={!connected}>
          Atualizar dados
        </Button>
        <p className="text-[10px] text-muted-foreground">
          {connected
            ? "Ações disponíveis para o provider conectado."
            : "Conecte uma plataforma para habilitar ações."}
        </p>
      </div>
    </BaseDockPanel>
  );
}
