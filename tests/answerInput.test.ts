import { describe, expect, it } from "vitest";

import {
  createAnswerInput,
  pressDigit
} from "../src/game/answerInput";

describe("answer input", () => {
  it("akzeptiert die erste richtige Ziffer einer zweistelligen Antwort", () => {
    const result = pressDigit(
      [2, 9],
      createAnswerInput(),
      1
    );

    expect(result.state.entered).toBe("1");
    expect(result.state.status).toBe("waiting");
    expect(result.answer).toBeNull();
  });

  it("erkennt eine vollständige zweistellige Antwort", () => {
    const first = pressDigit(
      [2, 9],
      createAnswerInput(),
      1
    );

    const second = pressDigit(
      [2, 9],
      first.state,
      8
    );

    expect(second.state.entered).toBe("18");
    expect(second.state.status).toBe("correct");
    expect(second.answer).toBe(18);
  });

it("erkennt eine falsche erste Ziffer sofort", () => {
  const result = pressDigit(
    [3, 4],
    createAnswerInput(),
    2
  );

  expect(result.state.status).toBe("wrong");
  expect(result.answer).toBe(2);
});

  it("erkennt eine falsche zweite Ziffer", () => {
    const first = pressDigit(
      [2, 9],
      createAnswerInput(),
      1
    );

    const second = pressDigit(
      [2, 9],
      first.state,
      7
    );

    expect(second.state.status).toBe("wrong");
    expect(second.answer).toBe(17);
  });

  it("wertet einstellige Antworten sofort aus", () => {
    const result = pressDigit(
      [2, 2],
      createAnswerInput(),
      4
    );

    expect(result.state.status).toBe("correct");
    expect(result.answer).toBe(4);
  });

  it("ignoriert weitere Ziffern nach einer abgeschlossenen Antwort", () => {
    const first = pressDigit(
      [2, 2],
      createAnswerInput(),
      4
    );

    const second = pressDigit(
      [2, 2],
      first.state,
      5
    );

    expect(second.state).toEqual(first.state);
    expect(second.answer).toBeNull();
  });

  it("weist ungültige Eingaben zurück", () => {
    expect(() =>
      pressDigit([2, 2], createAnswerInput(), 10)
    ).toThrow();

    expect(() =>
      pressDigit([2, 2], createAnswerInput(), -1)
    ).toThrow();
  });
});
