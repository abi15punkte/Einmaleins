import { describe, expect, it } from "vitest";

import {
  GAME_DURATION_MS,
  GameEngine,
  type Clock
} from "../src/game/engine";

function createTestClock(initial = 0): {
  clock: Clock;
  advance: (milliseconds: number) => void;
} {
  let current = initial;

  return {
    clock: {
      now: () => current
    },
    advance: (milliseconds: number) => {
      current += milliseconds;
    }
  };
}

describe("GameEngine", () => {
  it("startet mit der ersten Aufgabe", () => {
    const { clock } = createTestClock();
    const game = new GameEngine(() => 0.5, clock);

    const state = game.start();

    expect(state.phase).toBe("playing");
    expect(state.round).toBe(1);
    expect(state.poolIndex).toBe(0);
    expect(state.currentTask).not.toBeNull();
    expect(state.remainingTasks).toHaveLength(6);
  });

  it("entfernt eine korrekt beantwortete Aufgabe", () => {
    const { clock } = createTestClock();
    const game = new GameEngine(() => 0.5, clock);

    const state = game.start();
    const task = state.currentTask!;

    const result = game.answer(task[0] * task[1]);

    expect(result.correct).toBe(true);
    expect(result.points).toBeGreaterThan(0);
    expect(result.state.completedTasks).toBe(1);
    expect(result.state.remainingTasks).toHaveLength(5);
  });

  it("behält eine falsch beantwortete Aufgabe im Pool", () => {
    const { clock } = createTestClock();
    const game = new GameEngine(() => 0.5, clock);

    const state = game.start();
    const task = state.currentTask!;

    const result = game.answer(
      task[0] * task[1] === 0 ? 1 : 0
    );

    expect(result.correct).toBe(false);
    expect(result.points).toBe(0);
    expect(result.state.remainingTasks).toHaveLength(6);
    expect(result.state.streak).toBe(0);
  });

  it("überspringt eine falsch beantwortete Aufgabe und behält sie im Pool", () => {
    const { clock } = createTestClock();
    const game = new GameEngine(() => 0.5, clock);

    const start = game.start();
    const firstTask = start.currentTask!;

    const afterSkip = game.skipCurrentTask();

    expect(afterSkip.currentTask).not.toBeNull();
    expect(afterSkip.currentTask).not.toEqual(firstTask);

    expect(afterSkip.remainingTasks).toHaveLength(6);

    expect(
      afterSkip.remainingTasks.some(
        (task) =>
          task[0] === firstTask[0] &&
          task[1] === firstTask[1]
      )
    ).toBe(true);

    expect(afterSkip.completedTasks).toBe(0);
    expect(afterSkip.taskElapsedMs).toBe(0);
  });

  it("wechselt erst nach sechs korrekten Aufgaben zum nächsten Pool", () => {
    const { clock } = createTestClock();
    const game = new GameEngine(() => 0.5, clock);

    game.start();

    for (let i = 0; i < 6; i += 1) {
      const task = game.getState().currentTask!;

      game.answer(task[0] * task[1]);
    }

    const state = game.getState();

    expect(state.round).toBe(1);
    expect(state.poolIndex).toBe(1);
    expect(state.remainingTasks).toHaveLength(6);
    expect(state.completedTasks).toBe(6);
  });

  it("wechselt nach sechs Pools in Durchlauf 2", () => {
    const { clock } = createTestClock();
    const game = new GameEngine(() => 0.5, clock);

    game.start();

    for (let i = 0; i < 36; i += 1) {
      const task = game.getState().currentTask!;

      game.answer(task[0] * task[1]);
    }

    const state = game.getState();

    expect(state.round).toBe(2);
    expect(state.poolIndex).toBe(0);
    expect(state.remainingTasks).toHaveLength(6);
    expect(state.completedTasks).toBe(36);
  });

  it("wechselt nach 72 Aufgaben in Durchlauf 3", () => {
    const { clock } = createTestClock();
    const game = new GameEngine(() => 0.5, clock);

    game.start();

    for (let i = 0; i < 72; i += 1) {
      const task = game.getState().currentTask!;

      game.answer(task[0] * task[1]);
    }

    const state = game.getState();

    expect(state.round).toBe(3);
    expect(state.poolIndex).toBe(0);
    expect(state.remainingTasks).toHaveLength(64);
    expect(state.completedTasks).toBe(72);
  });

  it("erkennt den Sieg nach allen 136 Aufgaben", () => {
    const { clock } = createTestClock();
    const game = new GameEngine(() => 0.5, clock);

    game.start();

    for (let i = 0; i < 136; i += 1) {
      const task = game.getState().currentTask!;

      game.answer(task[0] * task[1]);
    }

    const state = game.getState();

    expect(state.phase).toBe("won");
    expect(state.currentTask).toBeNull();
    expect(state.completedTasks).toBe(136);
  });

  it("beendet das Spiel nach zehn Minuten", () => {
    const testClock = createTestClock();
    const game = new GameEngine(() => 0.5, testClock.clock);

    game.start();

    testClock.advance(GAME_DURATION_MS);

    const state = game.tick();

    expect(state.phase).toBe("timeUp");
    expect(state.elapsedMs).toBe(GAME_DURATION_MS);
    expect(state.currentTask).toBeNull();
  });

  it("berechnet die Aufgabenzeit unabhängig von Renderzyklen", () => {
    const testClock = createTestClock();
    const game = new GameEngine(() => 0.5, testClock.clock);

    game.start();

    testClock.advance(1500);

    const state = game.tick();

    expect(state.taskElapsedMs).toBe(1500);
  });

  it("setzt die Serie bei einer falschen Antwort zurück", () => {
    const testClock = createTestClock();
    const game = new GameEngine(() => 0.5, testClock.clock);

    game.start();

    for (let i = 0; i < 3; i += 1) {
      const task = game.getState().currentTask!;

      game.answer(task[0] * task[1]);
    }

    expect(game.getState().streak).toBe(3);

    const task = game.getState().currentTask!;

    game.answer(task[0] * task[1] + 1);

    expect(game.getState().streak).toBe(0);
  });
});
