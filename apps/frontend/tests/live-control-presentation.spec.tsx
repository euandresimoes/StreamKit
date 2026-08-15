import { renderToStaticMarkup } from "react-dom/server";
import type { LiveStream } from "@streamkit/contracts";

import { LivePreview } from "@/components/streamkit/LivePreview";

const stream = (overrides: Partial<LiveStream> = {}): LiveStream => ({
  capabilities: ["chat.read", "chat.write", "live.read"],
  channelDisplayName: "Streamer",
  channelId: "channel-id",
  connectionId: "12b28c21-cdd2-405a-824e-a54f20383195",
  preview: { channel: "streamer", state: "ready", videoId: null },
  provider: "twitch",
  state: "online",
  ...overrides,
});

describe("Live Control presentation", () => {
  it("keeps the preview panel visible while no transmission is connected", () => {
    const markup = renderToStaticMarkup(<LivePreview stream={null} />);

    expect(markup).not.toContain("<iframe");
    expect(markup).toContain("aguardando uma transmissão conectada");
  });

  it("uses the official Twitch player with the required parent", () => {
    const markup = renderToStaticMarkup(<LivePreview stream={stream()} />);

    expect(markup).toContain("https://player.twitch.tv/");
    expect(markup).toContain("parent=");
  });

  it("identifies the YouTube embed origin to avoid player configuration errors", () => {
    const markup = renderToStaticMarkup(
      <LivePreview
        stream={stream({
          preview: { channel: "streamer", state: "ready", videoId: "youtube-video-id" },
          provider: "youtube",
        })}
      />,
    );

    expect(markup).toContain("https://www.youtube.com/embed/youtube-video-id");
    expect(markup).toContain("enablejsapi=1");
    expect(markup).toContain("origin=http%3A%2F%2Flocalhost");
    expect(markup).toContain('referrerPolicy="strict-origin-when-cross-origin"');
  });

  it("does not render an iframe when the provider has no official preview", () => {
    const markup = renderToStaticMarkup(
      <LivePreview
        stream={stream({
          preview: { channel: "kick-channel", state: "unsupported", videoId: null },
          provider: "kick",
          state: "unavailable",
        })}
      />,
    );

    expect(markup).not.toContain("<iframe");
    expect(markup).toContain("não oferece preview oficial");
  });
});
