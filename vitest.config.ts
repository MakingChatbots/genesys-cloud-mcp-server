import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    isolate: false,
    watch: false,
    projects: [
      {
        test: {
          name: "unit",
          include: ["src/**/*.test.ts", "tests/integration/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "evaluation",
          include: ["tests/evaluations/**/*.test.ts"],
          setupFiles: ["dotenv/config"],
        },
      },
    ],
  },
});
