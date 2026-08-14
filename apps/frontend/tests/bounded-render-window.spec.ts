import {
  MAX_VISIBLE_PARTICIPANTS,
  selectBoundedItems,
} from "@/modules/performance/bounded-render-window";

describe("bounded render window", () => {
  it("never returns more than fifty participants and keeps the selected winner visible", () => {
    const items = Array.from({ length: 1_000 }, (_, index) => ({ id: `participant-${index}` }));

    const visible = selectBoundedItems(items, "participant-999");

    expect(visible).toHaveLength(MAX_VISIBLE_PARTICIPANTS);
    expect(visible.at(-1)?.id).toBe("participant-999");
  });

  it("preserves short lists without reusing the original array", () => {
    const items = [{ id: "one" }, { id: "two" }];

    const visible = selectBoundedItems(items);

    expect(visible).toEqual(items);
    expect(visible).not.toBe(items);
  });
});
