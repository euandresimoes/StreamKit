import { Activity } from "lucide-react";

export function LiveActivityPanel({ connected }: { connected: boolean }) {
  return (
    <section className="flex h-full min-w-[220px] flex-1 flex-col border-l border-border bg-card">
      <header className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3 text-xs font-semibold">
        <Activity className="size-3.5 text-muted-foreground" />
        Atividade
      </header>
      <div className="flex flex-1 items-center justify-center p-4 text-center text-xs text-muted-foreground">
        {connected ? "Nenhum evento recente." : "Eventos da live aparecerão aqui."}
      </div>
    </section>
  );
}
