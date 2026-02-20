import { fileURLToPath, URL } from "node:url";
import { resolve, dirname } from "path";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: "apps/osm2",
  base: "./",

  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./library", import.meta.url)),
    },
  },

  build: {
    outDir: resolve(__dirname, "dist-osm2"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "apps/osm2/index.html"),
      },
    },
  },
});
