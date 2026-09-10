import {
  createPool,
  createRoundThree
} from "./rounds";
import { pointsForCorrectAnswer } from "./scoring";
import { multiply, type Task } from "./tasks";
import type { RandomSource } from "./shuffle";

export const GAME_DURATION_MS = 10 * 60 * 1000;

export type GamePhase =
  | "ready"
  | "playing"
  | "won"
  | "timeUp";

export type RoundNumber = 1 | 2 | 3;

export interface Clock {
  now(): number;
}

export interface GameState {
  phase: GamePhase;
  round: RoundNumber;
  poolIndex: number;
  remainingTasks: Task[];
  currentTask: Task | null;
  score: number;
  streak: number;
  elapsedMs: number;
  taskElapsedMs: number;
  completedTasks: number;
}

export interface AnswerResult {
  correct: boolean;
  points: number;
  expectedAnswer: number;
  state: GameState;
}

const systemClock: Clock = {
  now: () => Date.now()
};

function initialState(): GameState {
  return {
    phase: "ready",
    round: 1,
    poolIndex: 0,
    remainingTasks: [],
    currentTask: null,
    score: 0,
    streak: 0,
    elapsedMs: 0,
    taskElapsedMs: 0,
    completedTasks: 0
  };
}

export class GameEngine {
  private state: GameState = initialState();

  private readonly random: RandomSource;

  private readonly clock: Clock;

  private startedAt: number | null = null;

  private taskStartedAt: number | null = null;

  constructor(
    random: RandomSource = Math.random,
    clock: Clock = systemClock
  ) {
    this.random = random;
    this.clock = clock;
  }

  getState(): GameState {
    return {
      ...this.state,
      remainingTasks: [...this.state.remainingTasks]
    };
  }

  start(): GameState {
    if (this.state.phase !== "ready") {
      throw new Error("The game has already started.");
    }

    const now = this.clock.now();

    this.startedAt = now;

    this.state = {
      ...initialState(),
      phase: "playing"
    };

    this.loadPool(1, 0);

    return this.getState();
  }

  answer(answer: number): AnswerResult {
    this.updateTime();

    if (this.state.phase !== "playing") {
      throw new Error("The game is not currently playing.");
    }

    if (this.state.currentTask === null) {
      throw new Error("There is no active task.");
    }

    if (!Number.isInteger(answer) || answer < 0 || answer > 99) {
      throw new Error("Answer must be an integer between 0 and 99.");
    }

    const task = this.state.currentTask;
    const expectedAnswer = multiply(task);
    const correct = answer === expectedAnswer;

    if (!correct) {
      this.state = {
        ...this.state,
        streak: 0
      };

      return {
        correct: false,
        points: 0,
        expectedAnswer,
        state: this.getState()
      };
    }

    const nextStreak = this.state.streak + 1;

    const points = pointsForCorrectAnswer(
      this.state.taskElapsedMs / 1000,
      nextStreak
    );

    this.state = {
      ...this.state,
      score: this.state.score + points,
      streak: nextStreak,
      completedTasks: this.state.completedTasks + 1,
      remainingTasks: this.state.remainingTasks.filter(
        (remainingTask) =>
          remainingTask[0] !== task[0] ||
          remainingTask[1] !== task[1]
      ),
      currentTask: null
    };

    this.advanceAfterCorrectAnswer();

    return {
      correct: true,
      points,
      expectedAnswer,
      state: this.getState()
    };
  }

  skipCurrentTask(): GameState {
    this.updateTime();

    if (this.state.phase !== "playing") {
      return this.getState();
    }

    if (this.state.currentTask === null) {
      return this.getState();
    }

    const currentTask = this.state.currentTask;

    const currentIndex = this.state.remainingTasks.findIndex(
      (task) =>
        task[0] === currentTask[0] &&
        task[1] === currentTask[1]
    );

    if (currentIndex === -1) {
      return this.getState();
    }

    const remainingTasks = [
      ...this.state.remainingTasks
    ];

    const [skippedTask] = remainingTasks.splice(
      currentIndex,
      1
    );

    if (skippedTask !== undefined) {
      remainingTasks.push(skippedTask);
    }

    this.state = {
      ...this.state,
      remainingTasks
    };

    this.setNextTask();

    return this.getState();
  }

  tick(): GameState {
    this.updateTime();

    return this.getState();
  }

  private updateTime(): void {
    if (
      this.state.phase !== "playing" ||
      this.startedAt === null
    ) {
      return;
    }

    const now = this.clock.now();

    const elapsedMs = Math.max(
      0,
      Math.min(
        now - this.startedAt,
        GAME_DURATION_MS
      )
    );

    const taskElapsedMs =
      this.taskStartedAt === null
        ? 0
        : Math.max(0, now - this.taskStartedAt);

    this.state = {
      ...this.state,
      elapsedMs,
      taskElapsedMs
    };

    if (elapsedMs >= GAME_DURATION_MS) {
      this.state = {
        ...this.state,
        phase: "timeUp",
        currentTask: null
      };
    }
  }

  private loadPool(
    round: RoundNumber,
    poolIndex: number
  ): void {
    let tasks: Task[];

    if (round === 1 || round === 2) {
      tasks = createPool(
        round,
        poolIndex,
        this.random
      );
    } else {
      tasks = createRoundThree(this.random);
    }

    this.state = {
      ...this.state,
      round,
      poolIndex,
      remainingTasks: [...tasks],
      currentTask: tasks[0] ?? null,
      taskElapsedMs: 0
    };

    this.taskStartedAt =
      this.state.currentTask === null
        ? null
        : this.clock.now();
  }

  private advanceAfterCorrectAnswer(): void {
    if (this.state.elapsedMs >= GAME_DURATION_MS) {
      this.state = {
        ...this.state,
        phase: "timeUp",
        currentTask: null
      };

      return;
    }

    if (this.state.remainingTasks.length > 0) {
      this.setNextTask();
      return;
    }

    if (this.state.round === 1) {
      if (this.state.poolIndex < 5) {
        this.loadPool(1, this.state.poolIndex + 1);
        return;
      }

      this.loadPool(2, 0);
      return;
    }

    if (this.state.round === 2) {
      if (this.state.poolIndex < 5) {
        this.loadPool(2, this.state.poolIndex + 1);
        return;
      }

      this.loadPool(3, 0);
      return;
    }

    this.state = {
      ...this.state,
      phase: "won",
      currentTask: null
    };

    this.taskStartedAt = null;
  }

  private setNextTask(): void {
    const nextTask = this.state.remainingTasks[0] ?? null;

    this.state = {
      ...this.state,
      currentTask: nextTask,
      taskElapsedMs: 0
    };

    this.taskStartedAt =
      nextTask === null
        ? null
        : this.clock.now();
  }
}
