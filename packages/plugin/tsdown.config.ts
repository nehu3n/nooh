import { defineConfig } from "tsdown";

import { tsdownBase } from "../../tsdown.base.ts";

export default defineConfig({
  ...tsdownBase,

  entry: {
    bun: "src/bun.ts",
    esbuild: "src/esbuild.ts",
    farm: "src/farm.ts",
    index: "src/index.ts",
    rolldown: "src/rolldown.ts",
    rollup: "src/rollup.ts",
    rsbuild: "src/rsbuild.ts",
    rspack: "src/rspack.ts",
    vite: "src/vite.ts",
    webpack: "src/webpack.ts",
  },
});
