import type { ProviderGuide } from "../types";

export const youtubeSetupGuide: ProviderGuide = {
  provider: "youtube",
  titleKey: "providerGuide.youtube.title",
  summaryKey: "providerGuide.youtube.summary",
  requirementKeys: [
    "providerGuide.youtube.requirementAccount",
    "providerGuide.youtube.requirementProject",
    "providerGuide.youtube.requirementApi",
    "providerGuide.youtube.requirementConsent",
    "providerGuide.youtube.requirementClient",
  ],
  docsUrl: "https://developers.google.com/youtube/v3/guides/auth/installed-apps",
  steps: [
    {
      titleKey: "providerGuide.youtube.step1Title",
      descriptionKey: "providerGuide.youtube.step1Description",
      actionLabelKey: "providerGuide.youtube.actionCloud",
      actionUrl: "https://console.cloud.google.com/projectcreate",
      imageUrl: "/assets/provider-guides/youtube/step-1.png",
    },
    {
      titleKey: "providerGuide.youtube.step2Title",
      descriptionKey: "providerGuide.youtube.step2Description",
      actionLabelKey: "providerGuide.youtube.actionLibrary",
      actionUrl: "https://console.cloud.google.com/apis/library",
      imageUrl: "/assets/provider-guides/youtube/step-2.png",
    },
    {
      titleKey: "providerGuide.youtube.step3Title",
      descriptionKey: "providerGuide.youtube.step3Description",
      actionLabelKey: "providerGuide.youtube.actionConsent",
      actionUrl: "https://console.cloud.google.com/apis/credentials/consent",
      imageUrl: "/assets/provider-guides/youtube/step-3.png",
    },
    {
      titleKey: "providerGuide.youtube.step4Title",
      descriptionKey: "providerGuide.youtube.step4Description",
      imageUrl: "/assets/provider-guides/youtube/step-4.png",
    },
    {
      titleKey: "providerGuide.youtube.step5Title",
      descriptionKey: "providerGuide.youtube.step5Description",
      actionLabelKey: "providerGuide.youtube.actionCredentials",
      actionUrl: "https://console.cloud.google.com/apis/credentials",
      imageUrl: "/assets/provider-guides/youtube/step-5.png",
    },
    {
      titleKey: "providerGuide.youtube.step6Title",
      descriptionKey: "providerGuide.youtube.step6Description",
      imageUrl: "/assets/provider-guides/youtube/step-6.png",
    },
  ],
};
