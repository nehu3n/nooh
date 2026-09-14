import { defineConfig } from "tsdown";

import { tsdownBase } from "../../tsdown.base.ts";

export default defineConfig({
  ...tsdownBase,

  clean: true,
  dts: false,
  format: ["esm"],
});
