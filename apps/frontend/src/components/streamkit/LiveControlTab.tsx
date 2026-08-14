import { Radio, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLiveControl } from "@/modules/live-control/use-live-control";
import { LivePlatformSelector } from "./LivePlatformSelector";
import { LivePreview } from "./LivePreview";
import { LiveChatPanel } from "./LiveChatPanel";
import { LiveMetadataEditor } from "./LiveMetadataEditor";

export function LiveControlTab() {
  const live = useLiveControl(true);
  const selected =
    live.streams.find((item) => item.connectionId === live.selectedId) ?? live.streams[0] ?? null;
  useEffect(() => {
    if (!live.selectedId && selected) live.select(selected.connectionId);
  }, [live.selectedId, live.select, selected]);
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Radio className="size-4" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Live Control</h1>
          <p className="text-xs text-muted-foreground">
            Preview oficial, chat e metadados da transmissão
          </p>
        </div>
        <Button
          className="ml-auto"
          variant="ghost"
          size="icon-sm"
          aria-label="Atualizar controle da live"
          onClick={() => void live.load()}
        >
          <RefreshCw />
        </Button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-5">
        {live.error && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {live.error}
          </div>
        )}
        {!live.streams.length ? (
          <div className="m-auto max-w-md rounded-2xl border border-dashed border-border p-8 text-center">
            <Radio className="mx-auto mb-3 size-7 text-muted-foreground" />
            <h2 className="font-semibold">Nenhuma transmissão conectada</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Conecte um provider em Configurações e inicie a conexão para acompanhar uma live.
            </p>
          </div>
        ) : (
          <>
            <LivePlatformSelector
              streams={live.streams}
              selectedId={selected?.connectionId ?? null}
              onSelect={live.select}
            />
            {selected && (
              <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.75fr)]">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {[
                      ["Status", selected.state],
                      ["Espectadores", selected.viewerCount?.toLocaleString() ?? "—"],
                      [
                        "Duração",
                        selected.durationSeconds
                          ? `${Math.floor(selected.durationSeconds / 60)} min`
                          : "—",
                      ],
                      ["Canal", selected.channelDisplayName],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-border bg-card p-3">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {label}
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>
                  <LivePreview stream={selected} />
                  <LiveMetadataEditor
                    metadata={selected.metadata}
                    busy={live.busy}
                    canEdit={selected.capabilities.includes("live.metadata.write")}
                    onSave={live.updateMetadata}
                  />
                </div>
                <LiveChatPanel stream={selected} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
