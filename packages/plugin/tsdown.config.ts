import { defineConfig } from "tsdown";

import { tsdownBase } from "../../tsdown.base.ts";

export default defineConfig({
  ...tsdownBase,

  entry: {
    bun: "src/targets/bun.ts",
    esbuild: "src/targets/esbuild.ts",
    farm: "src/targets/farm.ts",
    index: "src/index.ts",
    rolldown: "src/targets/rolldown.ts",
    rollup: "src/targets/rollup.ts",
    rsbuild: "src/targets/rsbuild.ts",
    rspack: "src/targets/rspack.ts",
    vite: "src/targets/vite.ts",
    webpack: "src/targets/webpack.ts",
  },
});
