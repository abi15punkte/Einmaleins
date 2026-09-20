import { defineConfig } from "vitest/config";

export default defineConfig({
  base: process.env.DEPLOY_BASE || "/Einmaleins/",

  test: {
    environment: "node",
    globals: true
  }
});
