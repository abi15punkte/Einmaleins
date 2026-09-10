import { describe, expect, it } from "vitest";

import {
  basePoints,
  multiplierForStreak,
  pointsForCorrectAnswer
} from "../src/game/scoring";

describe("Scoring", () => {
  it("berechnet die Basispunkte kontinuierlich", () => {
    expect(basePoints(0)).toBe(100);
    expect(basePoints(0.5)).toBeCloseTo(100 * Math.pow(0.5, 0.25));
    expect(basePoints(2)).toBe(50);
    expect(basePoints(4)).toBe(25);
  });

  it("rundet deterministisch vor Anwendung des Multiplikators ab", () => {
    expect(pointsForCorrectAnswer(2, 1)).toBe(50);
    expect(pointsForCorrectAnswer(1, 1)).toBe(70);
    expect(pointsForCorrectAnswer(1, 3)).toBe(140);
  });

  it("verwendet die Serienmultiplikatoren an den exakten Schwellen", () => {
    expect(multiplierForStreak(1)).toBe(1);
    expect(multiplierForStreak(2)).toBe(1);
    expect(multiplierForStreak(3)).toBe(2);
    expect(multiplierForStreak(9)).toBe(2);
    expect(multiplierForStreak(10)).toBe(3);
    expect(multiplierForStreak(19)).toBe(3);
    expect(multiplierForStreak(20)).toBe(5);
  });

  it("setzt nach einem Serienfehler den Ausgangsmultiplikator voraus", () => {
    expect(multiplierForStreak(0)).toBe(1);
    expect(pointsForCorrectAnswer(0, 0)).toBe(100);
  });
});
