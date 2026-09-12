/** biome-ignore-all lint/performance/noAwaitInLoops: ... */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import type { GeneratedOutput } from "@nooh-ts/compiler";

const MANIFEST = ".manifest.json";

interface OutputManifest {
  readonly modules: readonly string[];
}

const readManifest = async (root: string): Promise<OutputManifest> => {
  const path = resolve(root, ".nooh", MANIFEST);

  try {
    const content = await readFile(path, "utf8");
    const value: unknown = JSON.parse(content);

    if (
      typeof value !== "object" ||
      value === null ||
      !("modules" in value) ||
      !Array.isArray(value.modules) ||
      !value.modules.every((module) => typeof module === "string")
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
  const outputRoot = resolve(root, ".nooh");

  const previous = await readManifest(root);
  const nextModules = new Set(output.modules.map((module) => module.id));

  for (const module of previous.modules) {
    if (nextModules.has(module)) {
      continue;
    }

    const path = resolve(root, module);

    await rm(path, {
      force: true,
    });
  }

  for (const module of output.modules) {
    const path = resolve(root, module.id);

    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, module.code);
  }

  await mkdir(outputRoot, {
    recursive: true,
  });

  const manifest: OutputManifest = {
    modules: output.modules.map((module) => module.id),
  };

  await writeFile(
    resolve(outputRoot, MANIFEST),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
};
