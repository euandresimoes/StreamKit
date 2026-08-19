import type { IntegrationProvider } from "@streamlet/contracts";

import { cn } from "@/lib/utils";

export type BrandIconProvider = IntegrationProvider | "livepix";

export const BRAND_ICON_SOURCES: Readonly<Record<BrandIconProvider, string>> = Object.freeze({
  twitch: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/twitch.svg",
  youtube: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/youtube.svg",
  kick: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/kick.svg",
  livepix: "/assets/livepix.png",
});

const BRAND_NAMES: Readonly<Record<BrandIconProvider, string>> = Object.freeze({
  twitch: "Twitch",
  youtube: "YouTube",
  kick: "Kick",
  livepix: "LivePix",
});

export function BaseBrandIcon({
  provider,
  className,
  labelled = false,
}: {
  provider: BrandIconProvider;
  className?: string;
  labelled?: boolean;
}) {
  const name = BRAND_NAMES[provider];
  return (
    <img
      src={BRAND_ICON_SOURCES[provider]}
      className={cn("size-4 shrink-0 object-contain", className)}
      alt={labelled ? name : ""}
      aria-hidden={labelled ? undefined : true}
      draggable={false}
    />
  );
}

export function brandName(provider: BrandIconProvider): string {
  return BRAND_NAMES[provider];
}
