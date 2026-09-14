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
    {
      name: "gate-leaderboard-sync-to-game",
      transform(code, id) {
        if (!id.endsWith("/src/game/leaderboard.ts")) return null;

        const original = "installCompletedGamesSyncObserver();";
        if (!code.includes(original)) return null;

        const replacement = `if (typeof document !== "undefined") {
  const startLeaderboardSyncWhenGameAppears = (): void => {
    if (document.querySelector(".game-screen")) {
      installCompletedGamesSyncObserver();
      return;
    }

    const observer = new MutationObserver(() => {
      if (!document.querySelector(".game-screen")) return;
      observer.disconnect();
      installCompletedGamesSyncObserver();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startLeaderboardSyncWhenGameAppears, { once: true });
  } else {
    startLeaderboardSyncWhenGameAppears();
  }
}`;

        return { code: code.replace(original, replacement), map: null };
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
