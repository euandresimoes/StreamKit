import type { ProviderGuide } from "../types";

export const livePixSetupGuide: ProviderGuide = {
  provider: "livepix",
  title: "Connect LivePix",
  summary:
    "Create an OAuth application and let StreamKit register the local webhook automatically.",
  requirements: [
    "A LivePix account",
    "A LivePix OAuth application",
    "The application Client ID and Client Secret",
  ],
  docsUrl: "https://docs.livepix.gg/",
  steps: [
    {
      title: "Create the application",
      description: "Open the LivePix developer area and create an OAuth application for StreamKit.",
      actionLabel: "Open LivePix documentation",
      actionUrl: "https://docs.livepix.gg/",
    },
    {
      title: "Copy the credentials",
      description:
        "Copy the Client ID and Client Secret into the secure fields below. They are never sent to a StreamKit server.",
    },
    {
      title: "Allow the required scopes",
      description:
        "StreamKit uses account:read, wallet:read and webhooks to receive confirmed payments and fetch their details.",
    },
    {
      title: "Enable the webhook",
      description:
        "StreamKit starts a temporary local tunnel only for this integration and registers the webhook automatically.",
    },
  ],
};
