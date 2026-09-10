import {
  POOLS,
  THIRD_ROUND_TASKS,
  type Task,
  swapFactors
} from "./tasks";
import { shuffle, type RandomSource } from "./shuffle";

export function createRoundOne(random: RandomSource = Math.random): Task[] {
  return POOLS.flatMap((pool) => shuffle(pool, random));
}

export function createRoundTwo(random: RandomSource = Math.random): Task[] {
  return POOLS.flatMap((pool) =>
    shuffle(
      pool.map((task) => swapFactors(task)),
      random
    )
  );
}

export function createRoundThree(
  random: RandomSource = Math.random
): Task[] {
  return shuffle(THIRD_ROUND_TASKS, random);
}

export function createAllRounds(random: RandomSource = Math.random): {
  roundOne: Task[];
  roundTwo: Task[];
  roundThree: Task[];
} {
  return {
    roundOne: createRoundOne(random),
    roundTwo: createRoundTwo(random),
    roundThree: createRoundThree(random)
  };
}
