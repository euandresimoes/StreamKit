/** @jest-environment jsdom */

import { copyText } from "@/infrastructure/clipboard";

describe("copyText", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "streamkit");
  });

  it("uses the Electron clipboard bridge when available", async () => {
    const nativeCopy = jest.fn<Promise<void>, [string]>().mockResolvedValue();
    Object.defineProperty(window, "streamkit", {
      configurable: true,
      value: { copyText: nativeCopy },
    });

    await copyText("@winner");

    expect(nativeCopy).toHaveBeenCalledWith("@winner");
  });
});
