/** biome-ignore-all lint/performance/noAwaitInLoops: ... */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import type { GeneratedOutput } from "@nooh-ts/compiler";

const MANIFEST = ".manifest.json";

interface OutputManifest {
  readonly modules: readonly string[];
}

const readManifest = async (root: string): Promise<OutputManifest> => {
  try {
    const content = await readFile(resolve(root, ".nooh", MANIFEST), "utf8");

    const value: unknown = JSON.parse(content);

    if (
      typeof value !== "object" ||
      value === null ||
      !("modules" in value) ||
      !Array.isArray(value.modules) ||
      !value.modules.every((v) => typeof v === "string")
    ) {
      return {
        modules: [],
      };
    }

    return {
      modules: value.modules,
    };
  } catch {
    return {
      modules: [],
    };
  }
};

export const writeOutput = async (
  root: string,
  output: GeneratedOutput
): Promise<void> => {
  const previous = await readManifest(root);

  const next = new Set(output.modules.map((module) => module.id));

  for (const module of previous.modules) {
    if (next.has(module)) {
      continue;
    }

    await rm(resolve(root, module), {
      force: true,
    });
  }

  for (const module of output.modules) {
    const path = resolve(root, module.id);

    await mkdir(dirname(path), {
      recursive: true,
    });

    await writeFile(path, module.code);
  }

  const outputRoot = resolve(root, ".nooh");

  await mkdir(outputRoot, {
    recursive: true,
  });

  await writeFile(
    resolve(outputRoot, MANIFEST),
    `${JSON.stringify(
      {
        modules: output.modules.map((module) => module.id),
      } satisfies OutputManifest,
      null,
      2
    )}\n`
  );
};
