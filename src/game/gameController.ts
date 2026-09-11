import {
  createAnswerInput,
  pressDigit,
  type AnswerInputState
} from "./answerInput";
import {
  GameEngine,
  type AnswerResult,
  type GameState
} from "./engine";
import type { Task } from "./tasks";

export type DigitOutcomeKind = "partial-correct" | "correct" | "wrong";

export interface DigitOutcome {
  task: Task;
  entered: string;
  expectedAnswer: number;
  kind: DigitOutcomeKind;
}

export interface GameControllerState {
  game: GameState;
  input: AnswerInputState;
  lastAnswer: AnswerResult | null;
  lastDigitOutcome: DigitOutcome | null;
}

export class GameController {
  private readonly engine: GameEngine;
  private input = createAnswerInput();
  private lastAnswer: AnswerResult | null = null;
  private lastDigitOutcome: DigitOutcome | null = null;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  start(): GameControllerState {
    this.engine.start();
    this.input = createAnswerInput();
    this.lastAnswer = null;
    this.lastDigitOutcome = null;
    return this.getState();
  }

  pressDigit(digit: number): GameControllerState {
    const game = this.engine.getState();
    if (game.currentTask === null) return this.getState();

    const task = game.currentTask;
    const result = pressDigit(task, this.input, digit);
    this.input = result.state;

    const expectedText = String(task[0] * task[1]);
    const entered = result.state.entered;
    const kind: DigitOutcomeKind = entered === expectedText
      ? "correct"
      : expectedText.startsWith(entered)
        ? "partial-correct"
        : "wrong";

    this.lastDigitOutcome = {
      task,
      entered,
      expectedAnswer: task[0] * task[1],
      kind
    };

    if (result.answer !== null && this.input.status !== "waiting") {
      this.lastAnswer = this.engine.answer(result.answer);
      if (this.lastAnswer.correct) this.input = createAnswerInput();
    }

    return this.getState();
  }

  advanceAfterWrongAnswer(): GameControllerState {
    if (this.lastAnswer === null || this.lastAnswer.correct) return this.getState();
    this.engine.skipCurrentTask();
    this.input = createAnswerInput();
    this.lastDigitOutcome = null;
    return this.getState();
  }

  tick(): GameControllerState {
    this.engine.tick();
    return this.getState();
  }

  getState(): GameControllerState {
    return {
      game: this.engine.getState(),
      input: this.input,
      lastAnswer: this.lastAnswer,
      lastDigitOutcome: this.lastDigitOutcome
    };
  }
}
