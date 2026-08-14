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
  const providers: IntegrationProvider[] = ["twitch", "youtube", "kick"];
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Plataforma da transmissão">
      {providers.map((provider) => {
        const stream = streams.find((item) => item.provider === provider);
        return (
          <button
            key={provider}
            type="button"
            role="tab"
            aria-selected={selectedId === stream?.connectionId}
            disabled={!stream}
            onClick={() => stream && onSelect(stream.connectionId)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-colors ${selectedId === stream?.connectionId ? "border-primary bg-primary/10" : "border-border hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"}`}
          >
            <BaseBrandIcon provider={provider} />
            <span>{brandName(provider)}</span>
            <span className="text-muted-foreground">· {stream?.state ?? "não conectado"}</span>
          </button>
        );
      })}
    </div>
  );
}
