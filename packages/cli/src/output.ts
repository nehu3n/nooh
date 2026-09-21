/** biome-ignore-all lint/performance/noAwaitInLoops: ... */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import type { GeneratedOutput } from "@nooh-ts/compiler";

const MANIFEST = ".manifest.json";

interface OutputManifest {
  readonly modules: readonly string[];
}

export interface WriteOutputResult {
  readonly added: number;
  readonly changed: number;
  readonly removed: number;
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

export const writeModules = async (
  root: string,
  output: GeneratedOutput
): Promise<void> => {
  for (const module of output.modules) {
    const path = resolve(root, module.id);

    await mkdir(dirname(path), {
      recursive: true,
    });

    await writeFile(path, module.code);
  }
};

export const writeOutput = async (
  root: string,
  output: GeneratedOutput
): Promise<WriteOutputResult> => {
  const previous = await readManifest(root);

  const previousModules = new Map(
    previous.modules.map((module) => [module, true])
  );
  const nextModules = new Map(
    output.modules.map((module) => [module.id, module.code])
  );

  let added = 0;
  let changed = 0;
  let removed = 0;

  await writeModules(root, output);

  for (const module of output.modules) {
    if (previousModules.has(module.id)) {
      changed += 1;
    } else {
      added += 1;
    }
  }

  for (const module of previous.modules) {
    if (nextModules.has(module)) {
      continue;
    }

    await rm(resolve(root, module), {
      force: true,
    });

    removed += 1;
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

  return {
    added,
    changed,
    removed,
  };
};
