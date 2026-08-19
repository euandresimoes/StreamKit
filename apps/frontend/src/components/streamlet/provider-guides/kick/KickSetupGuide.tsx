import type { ProviderGuide } from "../types";

export const kickSetupGuide: ProviderGuide = {
  provider: "kick",
  titleKey: "providerGuide.kick.title",
  summaryKey: "providerGuide.kick.summary",
  requirementKeys: ["providerGuide.kick.requirementApp", "providerGuide.kick.requirementWebhook"],
  docsUrl: "https://kick.com/settings/developer",
  steps: [
    {
      titleKey: "providerGuide.kick.stepTitle",
      descriptionKey: "providerGuide.kick.stepDescription",
      actionLabelKey: "providerGuide.kick.action",
      actionUrl: "https://kick.com/settings/developer",
      imageUrl: "/assets/provider-guides/kick-step-1.png",
    },
  ],
};
