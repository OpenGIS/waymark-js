import { fileURLToPath, URL } from "node:url";
import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",

  define: { "process.env.NODE_ENV": '"production"' },

  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./library", import.meta.url)),
    },
  },

  css: {
    preprocessorOptions: {
      less: {
        // This injects the content of variables.less into every LESS file
        additionalData: `@import "@/assets/css/variables.less";`,
      },
    },
  },

  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, "library/entry.js"),
      name: "WaymarkJS",
      fileName: "waymark-js",
    },
    rollupOptions: {
      output: {
        assetFileNames: "waymark-js.[ext]",
      },
    },
  },

  test: {
    environment: "jsdom",
    globals: true,
  },

  // Specify port 1234
  server: {
    port: 1234,
  },

  // server: {
  //   open: "/index.html",
  //   allowedHosts: ["joe-dev.local"],
  // },
});
