import type { ProviderGuide } from "../types";

export const twitchSetupGuide: ProviderGuide = {
  provider: "twitch",
  title: "Connect Twitch",
  summary: "Register a Twitch application once, then authorize the channel with the device flow.",
  requirements: [
    "A Twitch account",
    "Two-factor authentication enabled",
    "A Twitch developer application",
  ],
  docsUrl: "https://dev.twitch.tv/docs/authentication/register-app",
  steps: [
    {
      title: "Register the application",
      description:
        "Create a Twitch application and use the Client ID already included in this build.",
      actionLabel: "Open Twitch developer console",
      actionUrl: "https://dev.twitch.tv/console/apps",
    },
    {
      title: "Authorize the channel",
      description:
        "StreamKit opens the official Twitch authorization page. Confirm the requested permissions for the channel owner.",
    },
    {
      title: "Start the chat connection",
      description:
        "After authorization, StreamKit validates the token and reconnects the selected channel automatically.",
    },
  ],
};
