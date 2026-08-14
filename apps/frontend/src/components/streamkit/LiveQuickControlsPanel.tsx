import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LiveQuickControlsPanel({ connected }: { connected: boolean }) {
  return (
    <section className="flex h-full min-w-[220px] flex-1 flex-col border-l border-border bg-card">
      <header className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3 text-xs font-semibold">
        <SlidersHorizontal className="size-3.5 text-muted-foreground" />
        Controles rápidos
      </header>
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
    </section>
  );
}
