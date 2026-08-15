import type { ReactNode } from "react";

export type ProviderGuideId = "livepix" | "twitch" | "youtube" | "kick";

export type ProviderGuideStep = {
  title: string;
  description: string;
  actionLabel?: string;
  actionUrl?: string;
  imageUrl?: string;
  visual?: ReactNode;
};

export type ProviderGuide = {
  provider: ProviderGuideId;
  title: string;
  summary: string;
  steps: ProviderGuideStep[];
  requirements: string[];
  docsUrl: string;
};
