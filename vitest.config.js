import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/docs/**/*.test.js"],
    setupFiles: ["tests/setup.js"],
  },
});
