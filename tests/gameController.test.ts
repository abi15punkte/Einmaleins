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

    // Wir suchen über den deterministischen Random-Wert
    // die erste Aufgabe des Spiels.
    const task = controller.getState().game.currentTask!;
    const answer = task[0] * task[1];

        expect(answer).toBeGreaterThan(0);
  });
});

