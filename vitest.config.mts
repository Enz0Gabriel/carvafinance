import "dotenv/config";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? "";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    passWithNoTests: true,
    projects: [
      {
        extends: true,
        plugins: [react()],
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}"],
          setupFiles: ["tests/setup.ts"],
        },
      },
      {
        extends: true,
        resolve: {
          alias: {
            // `server-only` throws outside Next's server runtime.
            "server-only": fileURLToPath(
              new URL("./tests/stubs/empty.ts", import.meta.url),
            ),
          },
        },
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          fileParallelism: false,
          globalSetup: ["tests/integration/global-setup.ts"],
          env: {
            DATABASE_URL: testDatabaseUrl,
            BETTER_AUTH_SECRET:
              process.env.BETTER_AUTH_SECRET ?? "test-secret-test-secret-test-secret!",
            BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
          },
        },
      },
    ],
  },
});
