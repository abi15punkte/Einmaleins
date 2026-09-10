export type RandomSource = () => number;

export function shuffle<T>(
  values: readonly T[],
  random: RandomSource = Math.random
): T[] {
  const result = [...values];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));

    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}
