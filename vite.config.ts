import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  return {
    base: env.DEPLOY_BASE || "/Einmaleins/",

    test: {
      environment: "node",
      globals: true
    }
  };
});
