import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "tests/browser",
    use: {
        baseURL: "http://localhost:5173",
    },
    webServer: {
        command: "npm run dev",
        url: "http://localhost:5173",
        reuseExistingServer: !process.env.CI,
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
