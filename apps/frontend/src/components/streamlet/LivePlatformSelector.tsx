import type { LiveStream } from "@streamlet/contracts";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  return (
    <div className="flex h-full min-w-0 items-center">
      <label className="flex h-full min-w-0 items-center gap-2 text-xs font-medium">
        <span className="sr-only">{t("live.platform")}</span>
        <Select value={selectedId ?? ""} onValueChange={onSelect}>
          <SelectTrigger
            id="live-select-stream"
            aria-label={t("live.platform")}
            className="h-full max-w-72 rounded-none border-0 bg-transparent px-2 shadow-none"
          >
            <SelectValue placeholder={t("live.selectStream")} />
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
                {t("live.noConnectedStreams")}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </label>
    </div>
  );
}
