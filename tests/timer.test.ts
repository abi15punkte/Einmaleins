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

describe("Timer", () => {
  it("beendet eine normale Runde erst nach zehn Minuten", () => {
    const testClock = createTestClock();
    const game = new GameEngine(() => 0.5, testClock.clock);

    game.start();
    testClock.advance(GAME_DURATION_MS - 1);

    expect(game.tick().phase).toBe("playing");
    expect(game.tick().elapsedMs).toBe(GAME_DURATION_MS - 1);
  });

  it("beendet das Spiel während einer Eingabe und nimmt die Antwort nicht mehr an", () => {
    const testClock = createTestClock();
    const game = new GameEngine(() => 0.5, testClock.clock);

    game.start();

    const task = game.getState().currentTask!;
    testClock.advance(GAME_DURATION_MS);

    expect(() => game.answer(task[0] * task[1])).toThrow(
      "The game is not currently playing."
    );

    const state = game.getState();
    expect(state.phase).toBe("timeUp");
    expect(state.currentTask).toBeNull();
    expect(state.completedTasks).toBe(0);
    expect(state.score).toBe(0);
  });

  it("beendet das Spiel direkt am Zeitlimit auch vor dem nächsten Aufgabenwechsel", () => {
    const testClock = createTestClock();
    const game = new GameEngine(() => 0.5, testClock.clock);

    game.start();
    const task = game.getState().currentTask!;

    testClock.advance(GAME_DURATION_MS);
    const state = game.tick();

    expect(state.phase).toBe("timeUp");
    expect(state.elapsedMs).toBe(GAME_DURATION_MS);
    expect(state.currentTask).toBeNull();

    expect(() => game.answer(task[0] * task[1])).toThrow(
      "The game is not currently playing."
    );
  });
});
