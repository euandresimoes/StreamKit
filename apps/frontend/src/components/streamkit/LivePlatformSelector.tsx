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
  return (
    <div className="flex h-full min-w-0 items-center">
      <label className="flex h-full min-w-0 items-center gap-2 text-xs font-medium">
        <span className="sr-only">Plataforma da transmissão</span>
        <Select value={selectedId ?? ""} onValueChange={onSelect}>
          <SelectTrigger
            aria-label="Plataforma da transmissão"
            className="h-full max-w-72 rounded-none border-0 bg-transparent px-2 shadow-none"
          >
            <SelectValue placeholder="Selecionar live" />
          </SelectTrigger>
          <SelectContent>
            {streams.map((stream) => (
              <SelectItem key={stream.connectionId} value={stream.connectionId}>
                <span className="flex min-w-0 items-center gap-2">
                  <BaseBrandIcon provider={stream.provider} />
                  <span className="truncate">
                    {brandName(stream.provider)} · {stream.channelDisplayName}
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
    </div>
  );
}
