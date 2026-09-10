import { describe, expect, it } from "vitest";
import {
  createRoundOne,
  createRoundThree,
  createRoundTwo
} from "../src/game/rounds";
import { POOLS, THIRD_ROUND_TASKS, taskKey, type Task } from "../src/game/tasks";
import { GameEngine } from "../src/game/engine";

const sequenceRandom = () => 0.5;

function keys(tasks: readonly Task[]): string[] {
  return tasks.map(taskKey);
}

describe("Aufgabenpools und Durchläufe", () => {
  it("contains the six exact pool definitions from the specification", () => {
    expect(POOLS).toEqual([
      [[2, 2], [3, 2], [4, 2], [5, 2], [3, 3], [4, 4]],
      [[6, 2], [4, 3], [5, 5], [6, 5], [7, 2], [5, 3]],
      [[8, 2], [9, 2], [6, 3], [5, 4], [6, 4], [7, 3]],
      [[8, 3], [9, 3], [7, 4], [8, 4], [9, 4], [6, 6]],
      [[7, 5], [8, 5], [9, 5], [7, 7], [8, 8], [9, 9]],
      [[7, 6], [8, 6], [9, 6], [8, 7], [9, 8], [9, 7]]
    ]);
    expect(POOLS).toHaveLength(6);
    expect(POOLS.every((pool) => pool.length === 6)).toBe(true);
  });

  it("plays every round-one task exactly once", () => {
    const round = createRoundOne(sequenceRandom);

    expect(round).toHaveLength(36);
    expect(new Set(keys(round)).size).toBe(36);
    expect(keys(round)).toEqual(
      expect.arrayContaining(POOLS.flatMap((pool) => pool.map(taskKey)))
    );
  });

  it("plays the factor-swapped pools in round two, including square tasks again", () => {
    const round = createRoundTwo(sequenceRandom);

    expect(round).toHaveLength(36);
    expect(new Set(keys(round)).size).toBe(36);
    expect(round).toEqual(
      expect.arrayContaining([
        [2, 2], [2, 3], [2, 4], [2, 5], [3, 3], [4, 4],
        [2, 6], [3, 4], [5, 5], [5, 6], [2, 7], [3, 5]
      ])
    );

    for (const square of [[2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8], [9, 9]] as Task[]) {
      expect(round.some((task) => task[0] === square[0] && task[1] === square[1])).toBe(true);
    }
  });

  it("contains exactly the prescribed 64 tasks in round three", () => {
    const round = createRoundThree(sequenceRandom);

    expect(round).toHaveLength(64);
    expect(new Set(keys(round)).size).toBe(64);
    expect(keys(round).sort()).toEqual(keys(THIRD_ROUND_TASKS).sort());

    for (const square of [[2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8], [9, 9]] as Task[]) {
      expect(round.filter((task) => task[0] === square[0] && task[1] === square[1])).toHaveLength(1);
    }
  });

  it("notifies exactly when rounds 1, 2, and 3 are completed", () => {
    const completedRounds: Array<{ round: number; completedTasks: number; phase: string; score: number }> = [];
    const engine = new GameEngine(sequenceRandom, { now: () => 0 }, (round, state) => {
      completedRounds.push({
        round,
        completedTasks: state.completedTasks,
        phase: state.phase,
        score: state.score
      });
    });

    engine.start();
    let safetyCounter = 0;

    while (engine.getState().phase === "playing") {
      const task = engine.getState().currentTask;
      expect(task).not.toBeNull();
      engine.answer((task as Task)[0] * (task as Task)[1]);
      safetyCounter += 1;
      expect(safetyCounter).toBeLessThanOrEqual(136);
    }

    expect(completedRounds.map((entry) => entry.round)).toEqual([1, 2, 3]);
    expect(completedRounds.map((entry) => entry.completedTasks)).toEqual([36, 72, 136]);
    expect(completedRounds.every((entry) => entry.phase === "playing")).toBe(true);
    expect(completedRounds[0]?.score).toBeGreaterThanOrEqual(0);
    expect(completedRounds[1]?.score).toBeGreaterThanOrEqual(completedRounds[0]?.score ?? 0);
    expect(completedRounds[2]?.score).toBeGreaterThanOrEqual(completedRounds[1]?.score ?? 0);
  });

  it("finishes the complete game after exactly 136 correct tasks", () => {
    const clock = { now: () => 0 };
    const engine = new GameEngine(sequenceRandom, clock);

    engine.start();

    let safetyCounter = 0;
    while (engine.getState().phase === "playing") {
      const task = engine.getState().currentTask;
      expect(task).not.toBeNull();

      engine.answer((task as Task)[0] * (task as Task)[1]);
      safetyCounter += 1;

      expect(safetyCounter).toBeLessThanOrEqual(136);
    }

    const finalState = engine.getState();
    expect(finalState.phase).toBe("won");
    expect(finalState.completedTasks).toBe(136);
    expect(finalState.round).toBe(3);
    expect(finalState.currentTask).toBeNull();
  });
});
