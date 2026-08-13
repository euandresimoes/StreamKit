import { renderToStaticMarkup } from "react-dom/server";

import { BaseBrandIcon, BRAND_ICON_SOURCES, brandName } from "@/components/base/BaseBrandIcon";

describe("BaseBrandIcon", () => {
  it("centralizes the official provider assets", () => {
    expect(BRAND_ICON_SOURCES).toEqual({
      kick: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/kick.svg",
      twitch: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/twitch.svg",
      youtube: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/youtube.svg",
    });
  });

  it("supports decorative and labelled usage", () => {
    expect(renderToStaticMarkup(<BaseBrandIcon provider="twitch" />)).toContain(
      'aria-hidden="true"',
    );
    expect(renderToStaticMarkup(<BaseBrandIcon provider="youtube" labelled />)).toContain(
      'alt="YouTube"',
    );
    expect(brandName("kick")).toBe("Kick");
  });
});
