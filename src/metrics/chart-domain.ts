export function chartDomain(
  values: Array<number | null>,
  includeZero = true,
  minimumSpan = 1,
): [number, number] {
  const known = values.filter(
    (v): v is number => v !== null && Number.isFinite(v),
  );
  if (!known.length) return [0, 1];
  const min = Math.min(...known),
    max = Math.max(...known);
  if (includeZero) return [Math.min(0, min), Math.max(1, max)];
  const padding = Math.max(
    (max - min) * 0.15,
    Math.max(0, minimumSpan - (max - min)) / 2,
    0.01,
  );
  return [Math.max(0, min - padding), max + padding];
}
