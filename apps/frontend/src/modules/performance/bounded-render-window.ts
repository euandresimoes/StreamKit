export const MAX_VISIBLE_PARTICIPANTS = 50;
export const MAX_VISIBLE_CHAT_MESSAGES = 50;

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
