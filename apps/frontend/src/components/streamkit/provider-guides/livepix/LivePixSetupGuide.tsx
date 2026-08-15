import type { ProviderGuide } from "../types";

export const livePixSetupGuide: ProviderGuide = {
  provider: "livepix",
  title: "Connect LivePix",
  summary:
    "The API documentation does not contain the application-creation button. Create the app from your logged-in LivePix dashboard first.",
  requirements: [
    "A LivePix account",
    "Access to the account settings/dashboard",
    "A LivePix API application with Client ID and Client Secret",
  ],
  docsUrl: "https://docs.livepix.gg/api",
  steps: [
    {
      title: "Open your LivePix dashboard",
      description:
        "Open the main LivePix website, sign in to the account that receives the payments, go to Settings > API and create a new application named StreamKit.\n\nCopy the Client ID and Client Secret into the secure fields below.",
      actionLabel: "Open LivePix",
      actionUrl: "https://livepix.gg/",
      imageUrl: "/assets/provider-guides/livepix/step-1.png",
    },
  ],
};
