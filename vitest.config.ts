import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      {
        plugins: [tsconfigPaths(), react()],
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}"],
          setupFiles: ["tests/setup.ts"],
        },
      },
      {
        plugins: [tsconfigPaths()],
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          fileParallelism: false,
        },
      },
    ],
  },
});
