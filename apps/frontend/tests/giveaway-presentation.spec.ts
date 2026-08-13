import { shouldShowGiveawayFocusedChat } from "@/modules/giveaway/giveaway-presentation";

describe("giveaway winner presentation", () => {
  it("does not reveal focused chat before the winner animation finishes", () => {
    expect(shouldShowGiveawayFocusedChat("drawing", "viewer", new Date().toISOString())).toBe(
      false,
    );
    expect(shouldShowGiveawayFocusedChat("revealed", "viewer", new Date().toISOString())).toBe(
      true,
    );
  });

  it("does not show a stale chat without a presented winner", () => {
    expect(shouldShowGiveawayFocusedChat("idle", null, new Date().toISOString())).toBe(false);
    expect(shouldShowGiveawayFocusedChat("revealed", null, new Date().toISOString())).toBe(false);
  });
});
