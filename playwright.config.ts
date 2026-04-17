import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://localhost:5191",
    headless: true,
    viewport: { width: 1200, height: 800 },
  },
  webServer: {
    // Port 5190 is only for tests so it never collides with `vite` (5173) or `vite preview` (4173).
    command: "npm run build && npm run preview:test",
    url: "http://localhost:5191",
    timeout: 120_000,
    reuseExistingServer: false,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});