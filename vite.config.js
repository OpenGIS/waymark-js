import { resolve } from "node:path";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    lib: {
      entry: resolve(import.meta.dirname, "src/entry.js"),
      fileName: "waymark",
      formats: ["es"],
    },
  },
  test: {
    environment: "jsdom",
    include: ["tests/docs/**/*.test.js"],
    setupFiles: ["tests/setup.js"],
  },
});
