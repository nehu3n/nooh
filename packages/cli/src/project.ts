import { readdir, stat } from "node:fs/promises";
import { relative, resolve } from "node:path";

import { loadConfig, type SourceSnapshot } from "@nooh-ts/compiler";

export interface Project {
  readonly config: string;
  readonly files: readonly string[];
  readonly root: string;
  readonly routesRoot: string;
}

const CONFIG_CANDIDATES = [
  "nooh.config.ts",
  "src/nooh.config.ts",
  "src/config.ts",
] as const;

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

const resolveConfig = async (
  root: string,
  explicitConfig?: string
): Promise<string> => {
  if (explicitConfig) {
    const config = resolve(root, explicitConfig);
    const configStat = await stat(config).catch(() => null);

    if (!configStat?.isFile()) {
      throw new Error(`Nooh config not found: ${relative(root, config)}`);
    }

    return config;
  }

  for (const candidate of CONFIG_CANDIDATES) {
    const config = resolve(root, candidate);
    // biome-ignore lint/performance/noAwaitInLoops: ...
    const configStat = await stat(config).catch(() => null);

    if (configStat?.isFile()) {
      return config;
    }
  }

  throw new Error(
    [
      "Nooh config not found.",
      "",
      "Searched for:",
      ...CONFIG_CANDIDATES.map((candidate) => `  ${candidate}`),
      "",
      "Use --config <path> to specify a custom config file.",
    ].join("\n")
  );
};

const loadProjectConfig = async (root: string, config: string) => {
  const result = await loadConfig({
    config,
    loader: {
      loadDefault: async (path) => {
        const module = await import(path);
        return module.default;
      },
    },
    root,
    sources: {
      files: [],
    } satisfies SourceSnapshot,
  });

  const diagnostic = result.diagnostics.find(
    (candidate) => candidate.severity === "error"
  );

  if (!result.config) {
    throw new Error(diagnostic?.message ?? "Failed to load Nooh config.");
  }

  return result.config;
};

export const discoverProject = async (
  cwd: string = process.cwd(),
  explicitConfig?: string
): Promise<Project> => {
  const root = resolve(cwd);
  const config = await resolveConfig(root, explicitConfig);

  const loadedConfig = await loadProjectConfig(root, config);

  const routesRoot = resolve(root, loadedConfig.routesRoot);

  const routesStat = await stat(routesRoot).catch(() => null);

  if (!routesStat?.isDirectory()) {
    throw new Error(
      `Nooh routes directory not found: ${relative(root, routesRoot)}`
    );
  }

  const files = await walk(routesRoot);

  return {
    config,
    files,
    root,
    routesRoot,
  };
};
