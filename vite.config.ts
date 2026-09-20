import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.DEPLOY_BASE || "/Einmaleins/",

  test: {
    environment: "node",
    globals: true
  }
});
