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

export interface GameControllerState {
  game: GameState;
  input: AnswerInputState;
  lastAnswer: AnswerResult | null;
}

export class GameController {
  private readonly engine: GameEngine;

  private input = createAnswerInput();

  private lastAnswer: AnswerResult | null = null;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  start(): GameControllerState {
    this.engine.start();

    this.input = createAnswerInput();
    this.lastAnswer = null;

    return this.getState();
  }

  pressDigit(digit: number): GameControllerState {
    const game = this.engine.getState();

    if (game.currentTask === null) {
      return this.getState();
    }

    const result = pressDigit(
      game.currentTask,
      this.input,
      digit
    );

    this.input = result.state;

    if (
      result.answer !== null &&
      this.input.status !== "waiting"
    ) {
      this.lastAnswer = this.engine.answer(result.answer);

      this.input = createAnswerInput();
    }

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
      lastAnswer: this.lastAnswer
    };
  }
}
