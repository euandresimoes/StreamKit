import type { IntegrationProvider } from "@streamkit/contracts";

import { cn } from "@/lib/utils";

export const BRAND_ICON_SOURCES: Readonly<Record<IntegrationProvider, string>> = Object.freeze({
  twitch: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/twitch.svg",
  youtube: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/youtube.svg",
  kick: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/kick.svg",
});

const BRAND_NAMES: Readonly<Record<IntegrationProvider, string>> = Object.freeze({
  twitch: "Twitch",
  youtube: "YouTube",
  kick: "Kick",
});

export function BaseBrandIcon({
  provider,
  className,
  labelled = false,
}: {
  provider: IntegrationProvider;
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

export function brandName(provider: IntegrationProvider): string {
  return BRAND_NAMES[provider];
}
