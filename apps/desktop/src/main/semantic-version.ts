export function compareSemanticVersions(left: string, right: string): number {
  const parse = (value: string) => {
    const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?$/.exec(value)
    if (!match) throw new Error(`Invalid semantic version: ${value}`)
    return { core: match.slice(1, 4).map(Number), pre: match[4]?.split('.') ?? [] }
  }
  const a = parse(left),
    b = parse(right)
  for (let index = 0; index < 3; index += 1)
    if (a.core[index] !== b.core[index]) return a.core[index]! > b.core[index]! ? 1 : -1
  if (!a.pre.length || !b.pre.length)
    return a.pre.length === b.pre.length ? 0 : a.pre.length ? -1 : 1
  const length = Math.max(a.pre.length, b.pre.length)
  for (let index = 0; index < length; index += 1) {
    const x = a.pre[index],
      y = b.pre[index]
    if (x === undefined) return -1
    if (y === undefined) return 1
    if (x === y) continue
    const xn = /^\d+$/.test(x),
      yn = /^\d+$/.test(y)
    if (xn && yn) return Number(x) > Number(y) ? 1 : -1
    if (xn !== yn) return xn ? -1 : 1
    return x > y ? 1 : -1
  }
  return 0
}

export function shouldPresentUpdate(
  current: string,
  available: string,
  skipped: string | null,
): boolean {
  return available !== skipped && compareSemanticVersions(available, current) > 0
}
