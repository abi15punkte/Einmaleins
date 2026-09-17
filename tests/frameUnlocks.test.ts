import { describe, expect, it } from "vitest";

import { evaluateFrameUnlocks, highestUnlockedFrame } from "../src/game/frameUnlocks";

describe("Rahmen-Freischaltung", () => {
  it("gibt unter Level 2 keinen Rahmen frei", () => {
    expect(evaluateFrameUnlocks(0, 1)).toEqual({ rahmenB: false, rahmenS: false, rahmenG: false });
  });

  it("gibt Rahmen B nur bei unter 10% frei", () => {
    expect(evaluateFrameUnlocks(0.09, 2).rahmenB).toBe(true);
    expect(evaluateFrameUnlocks(0.10, 2).rahmenB).toBe(false);
  });

  it("gibt Rahmen S nur bei unter 5% frei", () => {
    expect(evaluateFrameUnlocks(0.049, 2).rahmenS).toBe(true);
    expect(evaluateFrameUnlocks(0.05, 2).rahmenS).toBe(false);
  });

  it("gibt Rahmen G nur bei exakt 0% frei", () => {
    expect(evaluateFrameUnlocks(0, 2).rahmenG).toBe(true);
    expect(evaluateFrameUnlocks(0.0001, 2).rahmenG).toBe(false);
  });

  it("bei 0% werden alle drei Rahmen freigeschaltet", () => {
    const unlocks = evaluateFrameUnlocks(0, 2);

    expect(unlocks).toEqual({ rahmenB: true, rahmenS: true, rahmenG: true });
    expect(highestUnlockedFrame(unlocks)).toBe("G");
  });
});
