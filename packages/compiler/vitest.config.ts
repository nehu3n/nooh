import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    tsconfigPaths({
      projectDiscovery: "lazy",
    }),
  ],

  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
