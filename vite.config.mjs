import { defineConfig } from "vite";

export default defineConfig({
  base: "/Einmaleins/",
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
