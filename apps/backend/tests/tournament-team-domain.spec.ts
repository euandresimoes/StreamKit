import {
  availableSlotPositions,
  canOccupySlot,
  normalizedPersonName,
  reorderSeededValues,
} from '../src/modules/tournament/domain/team-slots'

describe('team slots', () => {
  it('keeps empty slots explicit and ordered', () => {
    expect(availableSlotPositions(4, [2, 4])).toEqual([1, 3])
  })
  it('rejects occupied and out-of-capacity positions', () => {
    expect(canOccupySlot(2, 2, [2])).toBe(false)
    expect(canOccupySlot(2, 3, [])).toBe(false)
    expect(canOccupySlot(2, 1, [])).toBe(true)
  })
  it('normalizes a person identity before duplicate checks', () => {
    expect(normalizedPersonName('  André ')).toBe(normalizedPersonName('ANDRÉ'))
  })
  it('reorders seeding without losing an entry', () => {
    expect(reorderSeededValues(['A', 'B', 'C', 'D'], 3, 2)).toEqual(['A', 'D', 'B', 'C'])
  })
  it('profiles all 32 teams at the 16-member MVP limit', () => {
    const started = performance.now()
    for (let team = 0; team < 32; team += 1) {
      const occupied: number[] = []
      for (let slot = 1; slot <= 16; slot += 1) {
        expect(canOccupySlot(16, slot, occupied)).toBe(true)
        occupied.push(slot)
      }
      expect(availableSlotPositions(16, occupied)).toEqual([])
    }
    expect(performance.now() - started).toBeLessThan(500)
  })
})
