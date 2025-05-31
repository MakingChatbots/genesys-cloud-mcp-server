export function* chunks<T>(arr: T[], n: number): Generator<T[], void> {
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error("Chunk size must be a positive integer");
  }

  for (let i = 0; i < arr.length; i += n) {
    yield arr.slice(i, i + n);
  }
}
