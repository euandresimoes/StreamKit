import type { IntegrationProvider } from "@streamlet/contracts";

import { cn } from "@/lib/utils";

export type BrandIconProvider = IntegrationProvider | "livepix";

export const BRAND_ICON_SOURCES: Readonly<Record<BrandIconProvider, string>> = Object.freeze({
  twitch: "./assets/twitch.svg",
  youtube: "./assets/youtube.svg",
  kick: "./assets/kick.svg",
  livepix: "./assets/livepix.png",
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
      onError={(event) => {
        event.currentTarget.style.display = "none";
      }}
    />
  );
}

export function brandName(provider: BrandIconProvider): string {
  return BRAND_NAMES[provider];
}
