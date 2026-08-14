import type { LiveStream } from "@streamkit/contracts";
import { ExternalLink, Radio } from "lucide-react";
import { getDesktopBridge } from "@/infrastructure/desktop-bridge";

export function LivePreview({ stream }: { stream: LiveStream }) {
  if (stream.preview.state !== "ready")
    return (
      <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
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
  const url =
    stream.provider === "twitch"
      ? `https://player.twitch.tv/?channel=${encodeURIComponent(stream.preview.channel)}&parent=${encodeURIComponent(parent)}`
      : stream.preview.videoId
        ? `https://www.youtube.com/embed/${encodeURIComponent(stream.preview.videoId)}`
        : null;
  if (!url)
    return (
      <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
        Identificador oficial do player ainda não foi retornado pelo provider.
      </div>
    );
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-black">
      <iframe
        title={`Preview oficial de ${stream.channelDisplayName}`}
        src={url}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        referrerPolicy="no-referrer"
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
