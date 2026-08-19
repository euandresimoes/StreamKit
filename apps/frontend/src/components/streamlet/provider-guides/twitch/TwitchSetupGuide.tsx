import type { ProviderGuide } from "../types";

export const twitchSetupGuide: ProviderGuide = {
  provider: "twitch",
  titleKey: "providerGuide.twitch.title",
  summaryKey: "providerGuide.twitch.summary",
  requirementKeys: [
    "providerGuide.twitch.requirementAccount",
    "providerGuide.twitch.requirement2fa",
    "providerGuide.twitch.requirementApp",
  ],
  docsUrl: "https://dev.twitch.tv/docs/authentication/register-app",
  steps: [
    {
      titleKey: "providerGuide.twitch.step1Title",
      descriptionKey: "providerGuide.twitch.step1Description",
      actionLabelKey: "providerGuide.twitch.action",
      actionUrl: "https://dev.twitch.tv/console/apps",
      imageUrl: "/assets/provider-guides/twitch/create-app.png",
    },
    {
      titleKey: "providerGuide.twitch.step2Title",
      descriptionKey: "providerGuide.twitch.step2Description",
      imageUrl: "/assets/provider-guides/twitch/connect-account.png",
    },
    {
      titleKey: "providerGuide.twitch.step3Title",
      descriptionKey: "providerGuide.twitch.step3Description",
    },
  ],
};
