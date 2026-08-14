import type { LiveStream } from "@streamkit/contracts";
import { ExternalLink, Radio } from "lucide-react";
import { getDesktopBridge } from "@/infrastructure/desktop-bridge";

export function LivePreview({ stream }: { stream: LiveStream | null }) {
  if (!stream)
    return (
      <div className="flex h-full min-h-0 items-center justify-center border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        <p>Preview oficial aguardando uma transmissão conectada.</p>
      </div>
    );
  if (stream.preview.state !== "ready")
    return (
      <div className="flex h-full min-h-0 items-center justify-center border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        <div>
          <Radio className="mx-auto mb-3 size-6" />
          <p>
            {stream.state === "offline"
              ? "A transmissão está offline."
              : stream.state === "unavailable"
                ? "Este provider não oferece preview oficial disponível."
                : "O preview oficial não está disponível para este canal."}
          </p>
        </div>
      </div>
    );
  const parent =
    typeof window === "undefined" ? "localhost" : window.location.hostname || "localhost";
  const playerOrigin =
    typeof window === "undefined" || window.location.origin === "null"
      ? "http://localhost"
      : window.location.origin;
  const url =
    stream.provider === "twitch"
      ? `https://player.twitch.tv/?channel=${encodeURIComponent(stream.preview.channel)}&parent=${encodeURIComponent(parent)}`
      : stream.preview.videoId
        ? `https://www.youtube.com/embed/${encodeURIComponent(stream.preview.videoId)}?enablejsapi=1&origin=${encodeURIComponent(playerOrigin)}&widget_referrer=${encodeURIComponent(playerOrigin)}`
        : null;
  if (!url)
    return (
      <div className="flex h-full min-h-0 items-center justify-center border border-border p-6 text-sm text-muted-foreground">
        Identificador oficial do player ainda não foi retornado pelo provider.
      </div>
    );
  return (
    <div className="relative h-full min-h-0 overflow-hidden border border-border bg-black">
      <iframe
        title={`Preview oficial de ${stream.channelDisplayName}`}
        src={url}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-presentation"
        className="size-full"
      />
      <button
        type="button"
        className="absolute right-3 top-3 rounded-lg bg-black/70 p-2 text-white"
        aria-label="Abrir player oficial"
        onClick={() => void getDesktopBridge().openExternalAuth(url)}
      >
        <ExternalLink className="size-4" />
      </button>
    </div>
  );
}
