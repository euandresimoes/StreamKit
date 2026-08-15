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
        "Do not look for the create button on docs.livepix.gg. Open the main LivePix website, sign in to the account that receives the payments, and enter the dashboard.",
      actionLabel: "Open LivePix",
      actionUrl: "https://livepix.gg/",
      imageUrl: "/assets/provider-guides/livepix/step-1.png",
    },
    {
      title: "Open account settings",
      description:
        "Inside the dashboard, open Settings, then API. Create a new application named StreamKit. If the form shows a notification URL/webhook field, leave it empty: StreamKit creates the temporary public URL and registers the webhook automatically after connecting.",
      actionLabel: "Open LivePix integrations help",
      actionUrl: "https://livepix.gg/paraseucanal/integracoes",
    },
    {
      title: "Create or request an API application",
      description:
        "Create an application for StreamKit if the option is available. If your account has no API, Developer or Applications option, contact LivePix support; the public documentation does not expose a separate self-service registration URL.",
      actionLabel: "Open LivePix API documentation",
      actionUrl: "https://docs.livepix.gg/api",
    },
    {
      title: "Copy the credentials into StreamKit",
      description:
        "Copy the Client ID and Client Secret into the secure fields below. StreamKit requests account:read, wallet:read and webhooks, reuses tokens until expiration and never sends your credentials to a StreamKit server.",
    },
    {
      title: "Let StreamKit configure the webhook",
      description:
        "After connecting, StreamKit starts the temporary local transport and registers the webhook automatically. The LivePix dashboard does not need a manually pasted callback URL.",
    },
  ],
};
