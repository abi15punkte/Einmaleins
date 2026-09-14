import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.DEPLOY_BASE || "/Einmaleins/",
  plugins: [
    {
      name: "build-version-injection",
      transformIndexHtml(html) {
        const buildId = process.env.BUILD_COMMIT?.slice(0, 12) || process.env.GITHUB_SHA?.slice(0, 12) || Date.now().toString(36);
        return html.replaceAll("__BUILD_ID__", buildId);
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        highscore: "highscore.html",
      },
    },
  },
});
