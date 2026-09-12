import { readdir, stat } from "node:fs/promises";
import { relative, resolve } from "node:path";

export interface Project {
  readonly config: string;
  readonly files: readonly string[];
  readonly root: string;
}

const isSourceFile = (path: string): boolean =>
  path.endsWith(".ts") || path.endsWith(".tsx");

const walk = async (root: string): Promise<string[]> => {
  const entries = await readdir(root, {
    withFileTypes: true,
  });

  const files: string[] = [];

  for (const entry of entries) {
    const path = resolve(root, entry.name);

    if (entry.isDirectory()) {
      // biome-ignore lint/performance/noAwaitInLoops: ...
      files.push(...(await walk(path)));
      continue;
    }

    if (entry.isFile() && isSourceFile(path)) {
      files.push(path);
    }
  }

  return files;
};

export const discoverProject = async (
  cwd: string = process.cwd()
): Promise<Project> => {
  const root = resolve(cwd);

  const config = resolve(root, "src/config.ts");

  const configStat = await stat(config).catch(() => null);

  if (!configStat?.isFile()) {
    throw new Error(`Nooh config not found: ${relative(root, config)}`);
  }

  const sourceRoot = resolve(root, "src");

  const files = await walk(sourceRoot);

  return {
    config,
    files,
    root,
  };
};
