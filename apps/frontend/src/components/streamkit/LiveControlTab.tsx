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

  const metrics = [
    ["Status", selected?.state ?? "offline"],
    ["Espectadores", selected?.viewerCount?.toLocaleString() ?? "—"],
    [
      "Duração",
      selected?.durationSeconds ? `${Math.floor(selected.durationSeconds / 60)} min` : "—",
    ],
    ["Canal", selected?.channelDisplayName ?? "Nenhum canal"],
  ];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-4 border-b border-border px-5 py-2">
        <LivePlatformSelector
          streams={live.streams}
          selectedId={selected?.connectionId ?? null}
          onSelect={live.select}
        />
        <div className="ml-auto flex items-center gap-2">
          {metrics.map(([label, value]) => (
            <div key={label} className="hidden min-w-20 border-l border-border pl-3 sm:block">
              <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="max-w-32 truncate text-xs font-semibold">{value}</p>
            </div>
          ))}
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
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-5">
        {live.error && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {live.error}
          </div>
        )}
        <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.75fr)]">
          <div className="space-y-4">
            <LivePreview stream={selected} />
            <LiveMetadataEditor
              metadata={selected?.metadata ?? EMPTY_METADATA}
              controls={selected?.metadataControls ?? []}
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
