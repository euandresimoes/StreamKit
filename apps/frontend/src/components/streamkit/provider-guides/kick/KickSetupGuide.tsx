import type { ProviderGuide } from "../types";

export const kickSetupGuide: ProviderGuide = {
  provider: "kick",
  title: "Connect Kick",
  summary:
    "Kick support is shown transparently while the official desktop-safe OAuth and webhook path is unavailable.",
  requirements: [
    "An official Kick OAuth flow suitable for a local desktop app",
    "An official supported chat delivery mechanism",
  ],
  docsUrl: "https://docs.kick.com/",
  steps: [
    {
      title: "Check official availability",
      description:
        "StreamKit will not use private endpoints, reverse-engineered WebSockets or an embedded client secret.",
      actionLabel: "Open Kick documentation",
      actionUrl: "https://docs.kick.com/",
    },
    {
      title: "Keep the account disconnected",
      description:
        "Until the official local-safe path exists, the app prevents a misleading partial connection.",
    },
  ],
};
