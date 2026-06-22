import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
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
