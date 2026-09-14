import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  base: "/Einmaleins/",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        highscore: resolve(__dirname, "highscore.html"),
      },
    },
  },
  plugins: [
    {
      name: "build-version-injection",
      transformIndexHtml(html) {
        const buildId = process.env.GITHUB_SHA?.slice(0, 12) || Date.now().toString(36);
        return html.replaceAll("__BUILD_ID__", buildId);
      },
    },
  ],
});
