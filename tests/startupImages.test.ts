import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { STARTUP_IMAGE_ASSETS, STARTUP_LOADING_ASSET } from "../src/startupImages";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("startup image manifest", () => {
  it("contains every image required by the current project start flow", () => {
    expect(new Set(STARTUP_IMAGE_ASSETS).size).toBe(STARTUP_IMAGE_ASSETS.length);
    expect(STARTUP_IMAGE_ASSETS).toHaveLength(49);
    expect(STARTUP_IMAGE_ASSETS[0]).toBe(STARTUP_LOADING_ASSET);
    expect(STARTUP_LOADING_ASSET).toBe("Ladebildschirm.png");
    expect(STARTUP_IMAGE_ASSETS).toEqual(expect.arrayContaining([
      "Ladebildschirm.png",
      "einmaleins-icon.svg",
      "10.png",
      "50.png",
      "100.png",
      "200.png",
      "10000.png",
      "Querformathinweis.png",
      "Background.png",
      "Alien.png",
      "P1.png",
      "P15.png",
      "P16.png",
      "M1.png",
      "M16.png",
      "Stern1.png",
      "Stern3.png",
      "RahmenB.png",
      "RahmenS.png",
      "RahmenG.png",
      "Tablet3.png"
    ]));

    for (const asset of STARTUP_IMAGE_ASSETS) {
      expect(existsSync(resolve(projectRoot, "public", asset))).toBe(true);
    }
  });
});
