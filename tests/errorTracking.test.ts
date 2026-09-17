import { describe, expect, it } from "vitest";

import { GameEngine, type Clock } from "../src/game/engine";

function createTestClock(initial = 0): { clock: Clock; advance: (milliseconds: number) => void } {
  let current = initial;
  return {
    clock: { now: () => current },
    advance: (milliseconds: number) => { current += milliseconds; }
  };
}

describe("Fehler- und Antwortzähler", () => {
  it("zählt jede abgeschlossene Antwort und nur falsche Antworten als Fehler", () => {
    const { clock } = createTestClock();
    const game = new GameEngine(() => 0.5, clock);
    game.start();

    const first = game.getState().currentTask!;
    game.answer(first[0] * first[1]);

    const second = game.getState().currentTask!;
    game.answer(second[0] * second[1] + 1);

    const third = game.getState().currentTask!;
    game.answer(third[0] * third[1]);

    expect(game.getState().answeredQuestions).toBe(3);
    expect(game.getState().errorCount).toBe(1);
  });

  it("berechnet den Fehlerquotienten beim Spielende einmalig", () => {
    const testClock = createTestClock();
    const game = new GameEngine(() => 0.5, testClock.clock);
    game.start();

    const first = game.getState().currentTask!;
    game.answer(first[0] * first[1]);
    const second = game.getState().currentTask!;
    game.answer(second[0] * second[1] + 1);

    testClock.advance(20_000);
    const finished = game.tick();

    expect(finished.phase).toBe("timeUp");
    expect(finished.answeredQuestions).toBe(2);
    expect(finished.errorCount).toBe(1);
    expect(finished.errorRate).toBe(0.5);

    testClock.advance(20_000);
    expect(game.tick().errorRate).toBe(0.5);
  });
});
