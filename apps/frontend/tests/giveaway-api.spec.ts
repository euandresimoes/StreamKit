import { GiveawayRoundSchema } from "@streamkit/contracts";

import { apiClient } from "@/infrastructure/api-client";
import { giveawayApi } from "@/modules/giveaway/giveaway-api";

describe("giveaway API", () => {
  it("parses the completed round instead of discarding the response", async () => {
    const request = jest.spyOn(apiClient, "request").mockResolvedValue(undefined as never);

    await giveawayApi.complete(
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
    );

    expect(request).toHaveBeenCalledWith(
      "/api/v1/giveaways/00000000-0000-4000-8000-000000000001/rounds/00000000-0000-4000-8000-000000000002/complete",
      { method: "POST", schema: GiveawayRoundSchema },
    );
  });
});
