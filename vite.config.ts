import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/Einmaleins/",

  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        highscore: "highscore.html",
        lehrerHighscore: "lehrer-highscore.html"
      }
    }
  },

  test: {
    environment: "node",
    globals: true
  }
});

