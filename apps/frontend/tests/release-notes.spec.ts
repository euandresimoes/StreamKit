import { getLocalizedReleaseNotes } from "@/modules/settings/release-notes";

describe("getLocalizedReleaseNotes", () => {
  const notes = `[EN-US]\nEnglish notes\n[/EN-US]\n\n[PT-BR]\nNotas em português\n[/PT-BR]`;

  it("selects the requested locale", () => {
    expect(getLocalizedReleaseNotes(notes, "pt-BR")).toBe("Notas em português");
  });

  it("falls back to English and supports legacy notes", () => {
    expect(getLocalizedReleaseNotes(notes, "es")).toBe("English notes");
    expect(getLocalizedReleaseNotes("Legacy notes", "es")).toBe("Legacy notes");
  });
});
