import type { ProviderGuide } from "../types";

export const kickSetupGuide: ProviderGuide = {
  provider: "kick",
  title: "Connect Kick",
  summary: "Connect Kick using its official OAuth and webhook APIs.",
  requirements: [
    "A Kick developer application with Client ID and Client Secret",
    "A registered local callback URL from the StreamKit OAuth flow",
  ],
  docsUrl: "https://docs.kick.com/",
  steps: [
    {
      title: "Create a Kick developer application",
      description:
        "Open the Kick developer portal, create an application, and register the redirect URL shown by StreamKit when authorization starts.",
      actionLabel: "Open Kick developer portal",
      actionUrl: "https://dev.kick.com/",
    },
    {
      title: "Enter the application credentials",
      description:
        "Copy the Client ID and Client Secret into the secure fields below. StreamKit then opens Kick's official authorization page and requests only the supported permissions.",
    },
  ],
};
