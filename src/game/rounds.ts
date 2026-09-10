import {
  POOLS,
  THIRD_ROUND_TASKS,
  type Task,
  swapFactors
} from "./tasks";
import { shuffle, type RandomSource } from "./shuffle";

export function createPool(
  round: 1 | 2,
  poolIndex: number,
  random: RandomSource = Math.random
): Task[] {
  const pool = POOLS[poolIndex];

  if (!pool) {
    throw new Error(`Unknown pool index: ${poolIndex}`);
  }

  const tasks =
    round === 1
      ? [...pool]
      : pool.map((task) => swapFactors(task));

  return shuffle(tasks, random);
}

export function createRoundOne(
  random: RandomSource = Math.random
): Task[] {
  return POOLS.flatMap((_, poolIndex) =>
    createPool(1, poolIndex, random)
  );
}

export function createRoundTwo(
  random: RandomSource = Math.random
): Task[] {
  return POOLS.flatMap((_, poolIndex) =>
    createPool(2, poolIndex, random)
  );
}

export function createRoundThree(
  random: RandomSource = Math.random
): Task[] {
  return shuffle(THIRD_ROUND_TASKS, random);
}

