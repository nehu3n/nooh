import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import type { GeneratedOutput } from "@nooh-ts/compiler";

export const writeOutput = async (
  root: string,
  output: GeneratedOutput
): Promise<void> => {
  for (const module of output.modules) {
    const path = resolve(root, module.id);

    // biome-ignore lint/performance/noAwaitInLoops: ...
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, module.code);
  }
};
