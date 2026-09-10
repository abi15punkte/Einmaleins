import type { Task } from "./tasks";

export type AnswerInputStatus =
  | "waiting"
  | "correct"
  | "wrong";

export interface AnswerInputState {
  entered: string;
  status: AnswerInputStatus;
}

export interface AnswerInputResult {
  state: AnswerInputState;
  answer: number | null;
}

export function expectedAnswer(task: Task): number {
  return task[0] * task[1];
}

export function createAnswerInput(): AnswerInputState {
  return {
    entered: "",
    status: "waiting"
  };
}

export function pressDigit(
  task: Task,
  state: AnswerInputState,
  digit: number
): AnswerInputResult {
  if (!Number.isInteger(digit) || digit < 0 || digit > 9) {
    throw new Error("Digit must be an integer from 0 to 9.");
  }

  if (state.status !== "waiting") {
    return {
      state,
      answer: null
    };
  }

  const expected = expectedAnswer(task);
  const expectedText = String(expected);
  const entered = `${state.entered}${digit}`;

  if (!expectedText.startsWith(entered)) {
    return {
      state: {
        entered,
        status: "wrong"
      },
      answer: Number(entered)
    };
  }

  if (entered === expectedText) {
    return {
      state: {
        entered,
        status: "correct"
      },
      answer: expected
    };
  }

  return {
    state: {
      entered,
      status: "waiting"
    },
    answer: null
  };
}
