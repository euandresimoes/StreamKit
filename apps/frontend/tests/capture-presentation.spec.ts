import { captureButtonLabel } from "@/modules/integration/capture-presentation";

describe("capture button presentation", () => {
  it("distinguishes idle and active capture", () => {
    expect(captureButtonLabel(false, 0)).toBe("Start capture");
    expect(captureButtonLabel(true, 6)).toBe("Capturing (6 participants)");
    expect(captureButtonLabel(true, 6, true)).toBe("Capture paused");
  });
});
