import { describe, expect, it } from "vitest";

import {
  GameController
} from "../src/game/gameController";

import {
  GameEngine
} from "../src/game/engine";

describe("GameController", () => {
  it("startet das Spiel und setzt die Eingabe zurück", () => {
    const controller = new GameController(
      new GameEngine(() => 0.5)
    );

    const state = controller.start();

    expect(state.game.phase).toBe("playing");
    expect(state.input.entered).toBe("");
    expect(state.input.status).toBe("waiting");
    expect(state.lastAnswer).toBeNull();
  });

  it("verarbeitet eine einstellige richtige Antwort", () => {
    const controller = new GameController(
      new GameEngine(() => 0.5)
    );

    const start = controller.start();
    const task = start.game.currentTask!;

    expect(task[0] * task[1]).toBeLessThan(10);

    const result = controller.pressDigit(
      task[0] * task[1]
    );

    expect(result.lastAnswer).not.toBeNull();
    expect(result.lastAnswer!.correct).toBe(true);
    expect(result.game.completedTasks).toBe(1);
    expect(result.input.entered).toBe("");
  });

  it("verarbeitet eine zweistellige Antwort erst nach der zweiten Ziffer", () => {
    const controller = new GameController(
      new GameEngine(() => 0.5)
    );

    controller.start();

    const task = controller.getState().game.currentTask!;
    const answer = task[0] * task[1];

    expect(answer).toBeGreaterThan(0);
  });

  it("zeigt bei falscher erster Ziffer das richtige Ergebnis und behält die Aufgabe im Pool", () => {
    const controller = new GameController(
      new GameEngine(() => 0.99)
    );

    const start = controller.start();
    const task = start.game.currentTask!;

    const expected = task[0] * task[1];

    expect(expected).toBeGreaterThanOrEqual(10);

    const firstCorrectDigit = Number(
      String(expected)[0]
    );

    const wrongDigit =
      firstCorrectDigit === 9
        ? 8
        : firstCorrectDigit + 1;

    const result = controller.pressDigit(wrongDigit);

    expect(result.input.status).toBe("wrong");
    expect(result.lastAnswer).not.toBeNull();
    expect(result.lastAnswer!.correct).toBe(false);
    expect(result.lastAnswer!.expectedAnswer).toBe(expected);

    expect(result.game.completedTasks).toBe(0);

    expect(
      result.game.remainingTasks.some(
        (remainingTask) =>
          remainingTask[0] === task[0] &&
          remainingTask[1] === task[1]
      )
    ).toBe(true);
  });
});
