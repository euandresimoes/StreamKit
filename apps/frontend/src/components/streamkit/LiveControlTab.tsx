import { RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLiveControl } from "@/modules/live-control/use-live-control";
import { LivePlatformSelector } from "./LivePlatformSelector";
import { LivePreview } from "./LivePreview";
import { LiveChatPanel } from "./LiveChatPanel";
import { LiveMetadataEditor } from "./LiveMetadataEditor";

const EMPTY_METADATA = {
  category: null,
  description: null,
  emotesEnabled: null,
  followersOnly: null,
  language: null,
  slowMode: null,
  subscribersOnly: null,
  tags: [],
  title: null,
  visibility: null,
};

export function LiveControlTab() {
  const live = useLiveControl(true);
  const selected =
    live.streams.find((item) => item.connectionId === live.selectedId) ?? live.streams[0] ?? null;

  useEffect(() => {
    if (!live.selectedId && selected) live.select(selected.connectionId);
  }, [live.selectedId, live.select, selected]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="flex h-12 shrink-0 items-center justify-end border-b border-border px-5">
        <Button
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

        <LivePlatformSelector
          streams={live.streams}
          selectedId={selected?.connectionId ?? null}
          onSelect={live.select}
        />

        <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.75fr)]">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {[
                ["Status", selected?.state ?? "offline"],
                ["Espectadores", selected?.viewerCount?.toLocaleString() ?? "—"],
                [
                  "Duração",
                  selected?.durationSeconds
                    ? `${Math.floor(selected.durationSeconds / 60)} min`
                    : "—",
                ],
                ["Canal", selected?.channelDisplayName ?? "Nenhum canal conectado"],
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
              metadata={selected?.metadata ?? EMPTY_METADATA}
              busy={live.busy}
              canEdit={Boolean(selected?.capabilities.includes("live.metadata.write"))}
              onSave={live.updateMetadata}
            />
          </div>
          <LiveChatPanel stream={selected} />
        </div>
      </div>
    </div>
  );
}
