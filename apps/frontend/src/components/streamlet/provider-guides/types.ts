import type { ReactNode } from "react";

export type ProviderGuideId = "livepix" | "twitch" | "youtube" | "kick";

export type ProviderGuideStep = {
  titleKey: string;
  descriptionKey: string;
  actionLabelKey?: string;
  actionUrl?: string;
  imageUrl?: string;
  visual?: ReactNode;
};

export type ProviderGuide = {
  provider: ProviderGuideId;
  titleKey: string;
  summaryKey: string;
  steps: ProviderGuideStep[];
  requirementKeys: string[];
  docsUrl: string;
};
