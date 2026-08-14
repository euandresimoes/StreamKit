import type { IntegrationProvider, LiveStream } from "@streamkit/contracts";
import { BaseBrandIcon, brandName } from "@/components/base/BaseBrandIcon";

export function LivePlatformSelector({
  streams,
  selectedId,
  onSelect,
}: {
  streams: LiveStream[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Plataforma da transmissão">
      {streams.map((stream) => (
        <button
          key={stream.connectionId}
          type="button"
          role="tab"
          aria-selected={selectedId === stream.connectionId}
          onClick={() => onSelect(stream.connectionId)}
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-colors ${selectedId === stream.connectionId ? "border-primary bg-primary/10" : "border-border hover:bg-surface-2"}`}
        >
          <BaseBrandIcon provider={stream.provider as IntegrationProvider} />
          <span>{brandName(stream.provider)}</span>
          <span className="text-muted-foreground">· {stream.state}</span>
        </button>
      ))}
    </div>
  );
}
