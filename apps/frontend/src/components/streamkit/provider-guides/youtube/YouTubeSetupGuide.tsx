import type { ProviderGuide } from "../types";

export const youtubeSetupGuide: ProviderGuide = {
  provider: "youtube",
  title: "Connect YouTube",
  summary: "Configure YouTube OAuth and authorize the channel in the Google browser flow.",
  requirements: [
    "A Google Cloud project",
    "YouTube Data API enabled",
    "A Desktop OAuth client",
    "The OAuth consent screen configured",
  ],
  docsUrl: "https://developers.google.com/youtube/v3/guides/auth/installed-apps",
  steps: [
    {
      title: "Configure Google Cloud",
      description:
        "Create a Desktop OAuth client, enable YouTube Data API v3 and add the channel owner as a test user when the app is in testing.",
      actionLabel: "Open YouTube OAuth guide",
      actionUrl: "https://console.cloud.google.com/apis/credentials",
    },
    {
      title: "Review the consent screen",
      description:
        "The Google account must approve the YouTube scope requested by StreamKit. A client secret may be required by the specific Google credential, but it must stay local and encrypted.",
    },
    {
      title: "Select the active live stream",
      description:
        "After authorization, StreamKit discovers the active broadcasts and the global live selector chooses the chat session.",
    },
  ],
};
