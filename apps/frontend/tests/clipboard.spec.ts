/** @jest-environment jsdom */

import { copyText } from "@/infrastructure/clipboard";

describe("copyText", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "streamlet");
  });

  it("uses the Electron clipboard bridge when available", async () => {
    const nativeCopy = jest.fn<Promise<void>, [string]>().mockResolvedValue();
    Object.defineProperty(window, "streamlet", {
      configurable: true,
      value: { copyText: nativeCopy },
    });

    await copyText("@winner");

    expect(nativeCopy).toHaveBeenCalledWith("@winner");
  });
});
