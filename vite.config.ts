import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/Einmaleins/",

  test: {
    environment: "node",
    globals: true
  }
});

