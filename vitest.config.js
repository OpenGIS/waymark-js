import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "jsdom",
    include: ["tests/docs/**/*.test.js"],
    setupFiles: ["tests/setup.js"],
  },
});
