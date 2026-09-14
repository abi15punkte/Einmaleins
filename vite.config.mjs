import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  base: "/Einmaleins/",
  build: {
    rollupOptions: {
      input: {
        main: `${rootDir}index.html`,
        highscore: `${rootDir}highscore.html`,
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
