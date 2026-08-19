import type { Locale } from "@streamlet/contracts";

const BLOCK_PATTERN = /\[([^\]]+)\]([\s\S]*?)\[\/\1\]/g;

function normalizeLocale(locale: string) {
  return locale.trim().toLowerCase().replace("_", "-");
}

export function getLocalizedReleaseNotes(notes: string, locale: Locale): string {
  const blocks = [...notes.matchAll(BLOCK_PATTERN)].map((match) => ({
    locale: normalizeLocale(match[1] ?? ""),
    content: (match[2] ?? "").trim(),
  }));
  if (blocks.length === 0) return notes.trim();
  const requested = normalizeLocale(locale);
  const base = requested.split("-")[0];
  const selected =
    blocks.find((block) => block.locale === requested) ??
    blocks.find((block) => block.locale === base) ??
    blocks.find((block) => block.locale === "en-us") ??
    blocks.find((block) => block.locale === "en");
  return selected?.content ?? blocks[0]?.content ?? "";
}
