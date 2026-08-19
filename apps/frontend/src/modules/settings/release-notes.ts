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
  if (blocks.length === 0) return normalizeReleaseNotesMarkup(notes);
  const requested = normalizeLocale(locale);
  const base = requested.split("-")[0];
  const selected =
    blocks.find((block) => block.locale === requested) ??
    blocks.find((block) => block.locale === base) ??
    blocks.find((block) => block.locale === "en-us") ??
    blocks.find((block) => block.locale === "en");
  return normalizeReleaseNotesMarkup(selected?.content ?? blocks[0]?.content ?? "");
}

function normalizeReleaseNotesMarkup(value: string): string {
  if (!/<[a-z][\s\S]*>/i.test(value)) return value.trim();
  const prepared = value
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "• ")
    .replace(/<\/(p|h[1-6]|li|ul|ol|div|section)>/gi, "\n");
  const document = new DOMParser().parseFromString(prepared, "text/html");
  return (document.body.textContent ?? "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
