import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  publicDir: false,
  build: {
    lib: {
      entry: resolve(import.meta.dirname, "src/entry.js"),
      fileName: "waymark",
      formats: ["es"],
    },
    rollupOptions: {
      external: ["maplibre-gl"],
    },
  },
});
