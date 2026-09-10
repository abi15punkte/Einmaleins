import { describe, expect, it } from "vitest";

import {
  POOLS,
  THIRD_ROUND_TASKS,
  taskKey,
  swapFactors
} from "../src/game/tasks";
import {
  createRoundOne,
  createRoundTwo,
  createRoundThree
} from "../src/game/rounds";
import {
  basePoints,
  multiplierForStreak,
  pointsForCorrectAnswer
} from "../src/game/scoring";

describe("Aufgabenpools", () => {
  it("enthält exakt sechs Pools", () => {
    expect(POOLS).toHaveLength(6);
  });

  it("jeder Pool enthält exakt sechs Aufgaben", () => {
    for (const pool of POOLS) {
      expect(pool).toHaveLength(6);
    }
  });

  it("Pool 1 ist exakt korrekt", () => {
    expect(POOLS[0].map(taskKey)).toEqual([
      "2x2",
      "3x2",
      "4x2",
      "5x2",
      "3x3",
      "4x4"
    ]);
  });

  it("Pool 2 ist exakt korrekt", () => {
    expect(POOLS[1].map(taskKey)).toEqual([
      "6x2",
      "4x3",
      "5x5",
      "6x5",
      "7x2",
      "5x3"
    ]);
  });

  it("Pool 3 ist exakt korrekt", () => {
    expect(POOLS[2].map(taskKey)).toEqual([
      "8x2",
      "9x2",
      "6x3",
      "5x4",
      "6x4",
      "7x3"
    ]);
  });

  it("Pool 4 ist exakt korrekt", () => {
    expect(POOLS[3].map(taskKey)).toEqual([
      "8x3",
      "9x3",
      "7x4",
      "8x4",
      "9x4",
      "6x6"
    ]);
  });

  it("Pool 5 ist exakt korrekt", () => {
    expect(POOLS[4].map(taskKey)).toEqual([
      "7x5",
      "8x5",
      "9x5",
      "7x7",
      "8x8",
      "9x9"
    ]);
  });

  it("Pool 6 ist exakt korrekt", () => {
    expect(POOLS[5].map(taskKey)).toEqual([
      "7x6",
      "8x6",
      "9x6",
      "8x7",
      "9x8",
      "9x7"
    ]);
  });
});

describe("Durchlauf 1", () => {
  it("enthält exakt 36 Aufgaben", () => {
    const tasks = createRoundOne(() => 0.5);

    expect(tasks).toHaveLength(36);
  });

  it("enthält jede Aufgabe genau einmal", () => {
    const tasks = createRoundOne(() => 0.5);
    const keys = tasks.map(taskKey);

    expect(new Set(keys).size).toBe(36);
  });
});

describe("Durchlauf 2", () => {
  it("vertauscht die Faktoren", () => {
    expect(swapFactors([3, 2])).toEqual([2, 3]);
    expect(swapFactors([6, 2])).toEqual([2, 6]);
    expect(swapFactors([9, 9])).toEqual([9, 9]);
  });

  it("enthält exakt 36 Aufgaben", () => {
    const tasks = createRoundTwo(() => 0.5);

    expect(tasks).toHaveLength(36);
  });

  it("spielt quadratische Aufgaben erneut", () => {
    const tasks = createRoundTwo(() => 0.5);
    const keys = tasks.map(taskKey);

    for (const key of [
      "2x2",
      "3x3",
      "4x4",
      "5x5",
      "6x6",
      "7x7",
      "8x8",
      "9x9"
    ]) {
      expect(keys).toContain(key);
    }
  });
});

describe("Durchlauf 3", () => {
  it("enthält exakt 64 Aufgaben", () => {
    expect(THIRD_ROUND_TASKS).toHaveLength(64);

    const tasks = createRoundThree(() => 0.5);

    expect(tasks).toHaveLength(64);
  });

  it("enthält keine Duplikate", () => {
    const keys = THIRD_ROUND_TASKS.map(taskKey);

    expect(new Set(keys).size).toBe(64);
  });

  it("verwendet ausschließlich die vorgegebene Aufgabenliste", () => {
    const expected = THIRD_ROUND_TASKS.map(taskKey).sort();
    const actual = createRoundThree(() => 0.5)
      .map(taskKey)
      .sort();

    expect(actual).toEqual(expected);
  });

  it("enthält jede Quadrataufgabe genau einmal", () => {
    const keys = THIRD_ROUND_TASKS.map(taskKey);

    for (const key of [
      "2x2",
      "3x3",
      "4x4",
      "5x5",
      "6x6",
      "7x7",
      "8x8",
      "9x9"
    ]) {
      expect(keys.filter((value) => value === key)).toHaveLength(1);
    }
  });
});

describe("Punktesystem", () => {
  it("liefert bei 0 Sekunden 100 Punkte", () => {
    expect(basePoints(0)).toBe(100);
  });

  it("liefert nach 0,5 Sekunden die korrekte Punktzahl", () => {
    expect(basePoints(0.5)).toBeCloseTo(
      100 * Math.pow(0.5, 0.25),
      10
    );
  });

  it("liefert nach 1 Sekunde die korrekte Punktzahl", () => {
    expect(basePoints(1)).toBeCloseTo(
      100 * Math.pow(0.5, 0.5),
      10
    );
  });

  it("liefert nach 2 Sekunden 50 Punkte", () => {
    expect(basePoints(2)).toBe(50);
  });

  it("liefert nach 4 Sekunden 25 Punkte", () => {
    expect(basePoints(4)).toBe(25);
  });

  it("verwendet die richtigen Serienmultiplikatoren", () => {
    expect(multiplierForStreak(0)).toBe(1);
    expect(multiplierForStreak(1)).toBe(1);
    expect(multiplierForStreak(2)).toBe(1);
    expect(multiplierForStreak(3)).toBe(2);
    expect(multiplierForStreak(9)).toBe(2);
    expect(multiplierForStreak(10)).toBe(3);
    expect(multiplierForStreak(19)).toBe(3);
    expect(multiplierForStreak(20)).toBe(5);
  });

  it("wendet den Multiplikator nach dem Runden der Basispunkte an", () => {
    expect(pointsForCorrectAnswer(2, 3)).toBe(100);
    expect(pointsForCorrectAnswer(4, 10)).toBe(75);
  });
});
