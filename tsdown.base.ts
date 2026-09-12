import type { UserConfig } from "tsdown";

export const tsdownBase = {
  clean: true,
  dts: true,
  format: ["esm"],
  outDir: "dist",
  platform: "node",
  sourcemap: true,
  target: "es2022",
  treeshake: true,
} satisfies UserConfig;
