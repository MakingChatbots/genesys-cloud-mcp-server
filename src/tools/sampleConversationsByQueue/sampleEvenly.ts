export function sampleEvenly<T>(list: T[], sampleSize: number): T[] {
  if (list.length <= sampleSize) return list;

  const step = list.length / sampleSize;
  return Array.from(
    { length: sampleSize },
    (_, i) => list[Math.floor(i * step)],
  );
}
