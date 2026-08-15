import type { ProviderGuide } from "../types";

export const youtubeSetupGuide: ProviderGuide = {
  provider: "youtube",
  title: "Connect YouTube",
  summary: "Create the Google Cloud project and OAuth consent configuration required by YouTube.",
  requirements: [
    "A Google account",
    "A Google Cloud project",
    "YouTube Data API enabled",
    "The OAuth consent screen configured",
    "A Desktop OAuth client ID",
  ],
  docsUrl: "https://developers.google.com/youtube/v3/guides/auth/installed-apps",
  steps: [
    {
      title: "Create a new Google Cloud project",
      description:
        "Open Google Cloud Console, create a new project and give it a recognizable name such as StreamKit.",
      actionLabel: "Open Google Cloud Console",
      actionUrl: "https://console.cloud.google.com/projectcreate",
      imageUrl: "/assets/provider-guides/youtube/step-1.png",
    },
    {
      title: "Enable YouTube Data API v3",
      description:
        "Go to APIs & Services, open Library, search for YouTube Data API v3 and click Enable.",
      actionLabel: "Open API Library",
      actionUrl: "https://console.cloud.google.com/apis/library",
      imageUrl: "/assets/provider-guides/youtube/step-2.png",
    },
    {
      title: "Create the OAuth consent app",
      description:
        "Go to APIs & Services, open OAuth consent screen, choose Overview and create a new app. Select External as the audience.",
      actionLabel: "Open OAuth consent screen",
      actionUrl: "https://console.cloud.google.com/apis/credentials/consent",
      imageUrl: "/assets/provider-guides/youtube/step-3.png",
    },
    {
      title: "Add the YouTube test user",
      description:
        "In OAuth consent screen, open Audience, go to Test users and add the email address of the YouTube account that will authorize StreamKit.",
      imageUrl: "/assets/provider-guides/youtube/step-4.png",
    },
    {
      title: "Create the OAuth client ID",
      description:
        "Go to APIs & Services, open Credentials, choose Create credentials and create a new OAuth client ID with application type Desktop app.",
      actionLabel: "Open Credentials",
      actionUrl: "https://console.cloud.google.com/apis/credentials",
      imageUrl: "/assets/provider-guides/youtube/step-5.png",
    },
    {
      title: "Copy the credentials into StreamKit",
      description:
        "After creating the credential, copy the Client ID and Client Secret into StreamKit. They are stored in the operating system secure storage and are never included in the build.",
      imageUrl: "/assets/provider-guides/youtube/step-6.png",
    },
  ],
};
