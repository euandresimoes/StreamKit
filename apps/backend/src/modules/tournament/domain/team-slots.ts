export function normalizedPersonName(value: string): string {
  return value.trim().normalize('NFKC').toLocaleLowerCase()
}

export function availableSlotPositions(capacity: number, occupied: readonly number[]): number[] {
  const used = new Set(occupied)
  return Array.from({ length: capacity }, (_, index) => index + 1).filter((slot) => !used.has(slot))
}

export function canOccupySlot(
  capacity: number,
  slotPosition: number,
  occupied: readonly number[],
): boolean {
  return slotPosition >= 1 && slotPosition <= capacity && !occupied.includes(slotPosition)
}

export function reorderSeededValues<T>(
  values: readonly T[],
  currentIndex: number,
  targetSeed: number,
): T[] {
  if (currentIndex < 0 || currentIndex >= values.length) return [...values]
  const result = [...values]
  const [value] = result.splice(currentIndex, 1)
  result.splice(Math.max(0, Math.min(targetSeed - 1, result.length)), 0, value!)
  return result
}
