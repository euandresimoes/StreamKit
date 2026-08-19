import { renderToStaticMarkup } from "react-dom/server";

import { BaseBrandIcon, BRAND_ICON_SOURCES, brandName } from "@/components/base/BaseBrandIcon";

describe("BaseBrandIcon", () => {
  it("centralizes the official provider assets", () => {
    expect(BRAND_ICON_SOURCES).toEqual({
      kick: "./assets/kick.svg",
      livepix: "./assets/livepix.png",
      twitch: "./assets/twitch.svg",
      youtube: "./assets/youtube.svg",
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
