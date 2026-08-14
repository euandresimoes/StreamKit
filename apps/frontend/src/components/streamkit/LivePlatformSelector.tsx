import type { LiveStream } from "@streamkit/contracts";
import { BaseBrandIcon, brandName } from "@/components/base/BaseBrandIcon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LivePlatformSelector({
  streams,
  selectedId,
  onSelect,
}: {
  streams: LiveStream[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const providers = ["twitch", "youtube", "kick"] as const;

  return (
    <div className="flex min-w-0 items-center gap-3">
      <label className="flex min-w-0 items-center gap-2 text-xs font-medium">
        <span className="sr-only">Plataforma da transmissão</span>
        <BaseBrandIcon
          provider={
            streams.find((stream) => stream.connectionId === selectedId)?.provider ?? "twitch"
          }
        />
        <Select value={selectedId ?? ""} onValueChange={onSelect}>
          <SelectTrigger aria-label="Plataforma da transmissão" className="max-w-72">
            <SelectValue placeholder="Selecionar live" />
          </SelectTrigger>
          <SelectContent>
            {streams.map((stream) => (
              <SelectItem key={stream.connectionId} value={stream.connectionId}>
                <span className="flex min-w-0 items-center gap-2">
                  <BaseBrandIcon provider={stream.provider} />
                  <span className="truncate">
                    {brandName(stream.provider)} · {stream.title ?? stream.channelDisplayName}
                  </span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{stream.state}</span>
                </span>
              </SelectItem>
            ))}
            {!streams.length && (
              <SelectItem value="empty" disabled>
                Nenhuma live conectada
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </label>
      <div className="hidden items-center gap-2 sm:flex" aria-label="Status das plataformas">
        {providers.map((provider) => {
          const connected = streams.some(
            (stream) => stream.provider === provider && stream.state === "online",
          );
          return (
            <span
              key={provider}
              className="flex items-center gap-1 text-[10px] text-muted-foreground"
              title={`${brandName(provider)}: ${connected ? "online" : "não conectado"}`}
            >
              <span
                className={`size-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
              />
              {brandName(provider)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
