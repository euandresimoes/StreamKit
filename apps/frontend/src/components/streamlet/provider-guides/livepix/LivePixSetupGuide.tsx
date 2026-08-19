import type { ProviderGuide } from "../types";

export const livePixSetupGuide: ProviderGuide = {
  provider: "livepix",
  titleKey: "providerGuide.livepix.title",
  summaryKey: "providerGuide.livepix.summary",
  requirementKeys: [
    "providerGuide.livepix.requirementAccount",
    "providerGuide.livepix.requirementDashboard",
    "providerGuide.livepix.requirementApp",
  ],
  docsUrl: "https://docs.livepix.gg/api",
  steps: [
    {
      titleKey: "providerGuide.livepix.stepTitle",
      descriptionKey: "providerGuide.livepix.stepDescription",
      actionLabelKey: "providerGuide.livepix.action",
      actionUrl: "https://livepix.gg/",
      imageUrl: "/assets/provider-guides/livepix/step-1.png",
    },
  ],
};
