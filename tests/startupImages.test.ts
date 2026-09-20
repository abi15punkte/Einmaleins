import { STARTUP_IMAGE_ASSETS } from "../src/startupImages";

describe("startup image manifest", () => {
  it("contains every image required by the current project start flow", () => {
    expect(new Set(STARTUP_IMAGE_ASSETS).size).toBe(STARTUP_IMAGE_ASSETS.length);
    expect(STARTUP_IMAGE_ASSETS).toHaveLength(47);
    expect(STARTUP_IMAGE_ASSETS).toEqual(expect.arrayContaining([
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
  });
});
