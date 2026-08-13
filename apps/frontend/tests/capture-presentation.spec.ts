import { captureButtonLabel } from "@/modules/integration/capture-presentation";

describe("capture button presentation", () => {
  it("distinguishes idle and active capture", () => {
    expect(captureButtonLabel(false, 0)).toBe("Iniciar captura");
    expect(captureButtonLabel(true, 6)).toBe("Capturando (6 participantes)");
  });
});
