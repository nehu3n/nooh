import { readFile } from "node:fs/promises";

import {
  compile,
  finalizeCompilation,
  introspectCompilation,
  type SourceFile,
  type SourceSnapshot,
} from "@nooh-ts/compiler";

import { writeOutput } from "@/output";
import { discoverProject } from "@/project";
import { ui } from "@/ui";

export interface BuildOptions {
  readonly config?: string;
  readonly quiet?: boolean;
}

export interface BuildResult {
  readonly duration: number;
  readonly modules: number;
  readonly success: boolean;
}

const printDiagnostics = (
  diagnostics: readonly {
    readonly file?: string;
    readonly message: string;
    readonly severity: "error" | "warning" | "info";
  }[]
): void => {
  for (const diagnostic of diagnostics) {
    const location = diagnostic.file ? `${ui.dim(diagnostic.file)}: ` : "";

    if (diagnostic.severity === "error") {
      ui.error(`${location}${diagnostic.message}`);
    } else if (diagnostic.severity === "warning") {
      console.error(`${ui.warning(location)}${diagnostic.message}`);
    } else {
      console.log(`${ui.info(location)}${diagnostic.message}`);
    }
  }
};

export const runBuild = async (
  options: BuildOptions = {}
): Promise<BuildResult> => {
  const startedAt = performance.now();

  const project = await discoverProject(process.cwd(), options.config);

  const files: SourceFile[] = await Promise.all(
    project.files.map(async (path) => ({
      content: await readFile(path, "utf-8"),
      path,
    }))
  );

  const snapshot: SourceSnapshot = {
    files,
  };

  const loader = {
    loadDefault: async (path: string) => {
      const module = await import(path);

      return module.default;
    },

    loadModule: async (path: string) => import(path),
  };

  let result = await compile({
    config: project.config,
    loader,
    options: {
      outputRoot: ".nooh",
    },
    root: project.root,
    sources: snapshot,
  });

  printDiagnostics(result.diagnostics);

  if (!result.output) {
    const duration = performance.now() - startedAt;

    if (!options.quiet) {
      console.error();
      console.error(ui.error(`build failed in ${ui.duration(duration)}`));
    }

    return {
      duration,
      modules: 0,
      success: false,
    };
  }

  await writeOutput(project.root, result.output);

  const dependencySources = files.filter((file) => {
    const normalized = file.path.replaceAll("\\", "/");

    const root = project.dependenciesRoot.replaceAll("\\", "/");

    return normalized === root || normalized.startsWith(`${root}/`);
  });

  const introspection = await introspectCompilation({
    compilation: result,
    dependencySources,
    loader,
  });

  printDiagnostics(introspection.diagnostics);

  if (!introspection.introspection) {
    const duration = performance.now() - startedAt;

    if (!options.quiet) {
      console.error();
      console.error(ui.error(`build failed in ${ui.duration(duration)}`));
    }

    return {
      duration,
      modules: 0,
      success: false,
    };
  }

  result = finalizeCompilation(result, introspection.introspection);

  const duration = performance.now() - startedAt;

  if (!options.quiet) {
    console.log(
      ui.success(
        `generated ${ui.bold(
          `${result.output?.modules.length ?? 0}`
        )} modules in ${ui.duration(duration)}`
      )
    );
  }

  return {
    duration,
    modules: result.output?.modules.length ?? 0,
    success: true,
  };
};
