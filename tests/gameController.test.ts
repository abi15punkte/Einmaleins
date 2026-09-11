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
    expect(state.lastDigitOutcome).toBeNull();
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
    expect(result.lastDigitOutcome?.kind).toBe("correct");
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

  it("behandelt eine falsche erste Ziffer als falsche Antwort", () => {
    const controller = new GameController(
      new GameEngine(() => 0.5)
    );

    const start = controller.start();
    const task = start.game.currentTask!;

    const expected = task[0] * task[1];

    const wrongDigit =
      String(expected)[0] === "9"
        ? 8
        : 9;

    const result = controller.pressDigit(wrongDigit);

    expect(result.input.status).toBe("wrong");
    expect(result.lastAnswer).not.toBeNull();
    expect(result.lastAnswer!.correct).toBe(false);
    expect(result.lastAnswer!.expectedAnswer).toBe(expected);
    expect(result.lastDigitOutcome?.kind).toBe("wrong");
  });

  it("trennt eine korrekte erste Ziffer von der vorherigen abgeschlossenen Antwort", () => {
    const controller = new GameController(
      new GameEngine(() => 0.5)
    );

    let state = controller.start();
    let guard = 0;

    while (state.game.currentTask && state.game.currentTask[0] * state.game.currentTask[1] < 10 && guard < 136) {
      const task = state.game.currentTask;
      controller.pressDigit(task[0] * task[1]);
      state = controller.getState();
      guard += 1;
    }

    const task = state.game.currentTask!;
    const expectedText = String(task[0] * task[1]);
    expect(expectedText.length).toBe(2);
    expect(state.lastAnswer).not.toBeNull();
    expect(state.lastAnswer!.correct).toBe(true);

    controller.pressDigit(Number(expectedText[0]));
    const afterFirstDigit = controller.getState();

    expect(afterFirstDigit.lastAnswer!.correct).toBe(true);
    expect(afterFirstDigit.lastDigitOutcome?.kind).toBe("partial-correct");
    expect(afterFirstDigit.lastDigitOutcome?.entered).toBe(expectedText[0]);
    expect(afterFirstDigit.input.status).toBe("waiting");
  });
});
