import "../startup";

export function basePoints(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new Error("seconds must be a finite non-negative number");
  }

  return 100 * Math.pow(0.5, seconds / 2);
}

export function multiplierForStreak(streak: number): number {
  if (!Number.isInteger(streak) || streak < 0) {
    throw new Error("streak must be a non-negative integer");
  }

  if (streak >= 20) return 5;
  if (streak >= 10) return 3;
  if (streak >= 3) return 2;
  return 1;
}

export function pointsForCorrectAnswer(seconds: number, streak: number): number {
  const base = Math.floor(basePoints(seconds));
  return base * multiplierForStreak(streak);
}
