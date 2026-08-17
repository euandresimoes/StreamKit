export const MAX_VISIBLE_PARTICIPANTS = 50;
export const MAX_VISIBLE_WHEEL_PARTICIPANTS = 500;
export const MAX_VISIBLE_CHAT_MESSAGES = 50;
export const MAX_QUEUED_CHAT_MESSAGES = 100;

export function selectBoundedItems<T extends { id: string }>(
  items: readonly T[],
  preferredId?: string | null,
  limit = MAX_VISIBLE_PARTICIPANTS,
): T[] {
  if (items.length <= limit) return [...items];
  const visible = items.slice(0, limit);
  if (!preferredId || visible.some((item) => item.id === preferredId)) return visible;
  const preferred = items.find((item) => item.id === preferredId);
  return preferred ? [...visible.slice(0, limit - 1), preferred] : visible;
}

export function selectRandomSampledItems<T extends { id: string }>(
  items: readonly T[],
  preferredId: string | null | undefined,
  limit: number,
): T[] {
  if (items.length <= limit) return [...items];

  const sampled = items.slice(0, limit);
  // The sample must look random but remain stable across polling refreshes.
  // The participant set is the seed, so only an actual membership change reshuffles it.
  let seed = 2_166_136_261;
  for (const item of items) {
    for (let index = 0; index < item.id.length; index += 1) {
      seed ^= item.id.charCodeAt(index);
      seed = Math.imul(seed, 16_777_619) >>> 0;
    }
  }
  const nextRandom = () => {
    seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
    return seed;
  };
  for (let index = limit; index < items.length; index += 1) {
    const replacement = nextRandom() % (index + 1);
    if (replacement < limit) sampled[replacement] = items[index]!;
  }
  if (!preferredId || sampled.some((item) => item.id === preferredId)) return sampled;

  const preferred = items.find((item) => item.id === preferredId);
  if (!preferred) return sampled;
  sampled[sampled.length - 1] = preferred;
  return sampled;
}
