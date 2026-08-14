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
  const current = streams.find((stream) => stream.connectionId === selectedId);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <label className="flex min-w-0 items-center gap-2 text-xs font-medium">
        <span className="sr-only">Plataforma da transmissão</span>
        <BaseBrandIcon provider={current?.provider ?? "twitch"} />
        <select
          aria-label="Plataforma da transmissão"
          value={selectedId ?? ""}
          onChange={(event) => {
            const stream = streams.find((item) => item.connectionId === event.target.value);
            if (stream) onSelect(stream.connectionId);
          }}
          className="h-8 max-w-52 rounded-lg border border-border bg-card px-2 text-xs outline-none transition focus:border-primary"
        >
          <option value="">Selecionar plataforma</option>
          {providers.map((provider) => {
            const stream = streams.find((item) => item.provider === provider);
            return (
              <option key={provider} value={stream?.connectionId ?? provider} disabled={!stream}>
                {brandName(provider)} · {stream?.state ?? "não conectado"}
              </option>
            );
          })}
        </select>
      </label>
      <div className="hidden items-center gap-2 sm:flex" aria-label="Status das plataformas">
        {providers.map((provider) => {
          const stream = streams.find((item) => item.provider === provider);
          return (
            <span
              key={provider}
              className="flex items-center gap-1 text-[10px] text-muted-foreground"
              title={`${brandName(provider)}: ${stream?.state ?? "não conectado"}`}
            >
              <span
                className={`size-1.5 rounded-full ${stream ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
              />
              {brandName(provider)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
