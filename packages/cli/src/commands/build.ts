import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  compile,
  finalizeCompilation,
  generate,
  introspectCompilation,
  type SourceFile,
  type SourceSnapshot,
} from "@nooh-ts/compiler";

import { type NamespacedUnregister, register } from "tsx/esm/api";

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

const loadProjectModule = (
  loader: NamespacedUnregister,
  root: string,
  modulePath: string
): Promise<unknown> => {
  const absolutePath = resolve(root, modulePath);
  const moduleUrl = pathToFileURL(absolutePath).href;

  return loader.import(moduleUrl, moduleUrl);
};

export const runBuild = async (
  options: BuildOptions = {}
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: ...
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

  const tsconfig = resolve(project.root, "tsconfig.json");

  const loader: NamespacedUnregister = register({
    namespace: `nooh-${process.pid}-${randomUUID()}`,
    tsconfig,
  });

  try {
    const compilerLoader = {
      loadDefault: async (path: string): Promise<unknown> => {
        const module = await loadProjectModule(loader, project.root, path);

        if (
          typeof module !== "object" ||
          module === null ||
          !("default" in module)
        ) {
          throw new Error(`Module "${path}" does not have a default export.`);
        }

        return module.default;
      },
    };

    const compilation = await compile({
      config: project.config,
      loader: compilerLoader,
      options: {
        outputRoot: ".nooh",
      },
      root: project.root,
      sources: snapshot,
    });

    for (const diagnostic of compilation.diagnostics) {
      const location = diagnostic.file ? `${ui.dim(diagnostic.file)}: ` : "";

      if (diagnostic.severity === "error") {
        ui.error(`${location}${diagnostic.message}`);
      } else if (diagnostic.severity === "warning") {
        console.error(`${ui.warning(location)}${diagnostic.message}`);
      } else {
        console.log(`${ui.info(location)}${diagnostic.message}`);
      }
    }

    const compilationDuration = performance.now() - startedAt;

    if (!(compilation.output && compilation.plan)) {
      if (!options.quiet) {
        console.error();
        console.error(
          ui.error(`build failed in ${ui.duration(compilationDuration)}`)
        );
      }

      return {
        duration: compilationDuration,
        modules: 0,
        success: false,
      };
    }

    await writeOutput(project.root, compilation.output);

    const introspection = await introspectCompilation({
      compilation,
      dependencySources: files,
      loader: compilerLoader,
    });

    for (const diagnostic of introspection.diagnostics) {
      const location = diagnostic.file ? `${ui.dim(diagnostic.file)}: ` : "";

      if (diagnostic.severity === "error") {
        ui.error(`${location}${diagnostic.message}`);
      } else if (diagnostic.severity === "warning") {
        console.error(`${ui.warning(location)}${diagnostic.message}`);
      } else {
        console.log(`${ui.info(location)}${diagnostic.message}`);
      }
    }

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

    const finalized = finalizeCompilation(
      compilation,
      introspection.introspection
    );

    // biome-ignore lint/style/noNonNullAssertion: ...
    const output = generate(finalized.plan!, finalized.model);
    const written = await writeOutput(project.root, output);

    const duration = performance.now() - startedAt;

    if (!options.quiet) {
      console.log(
        ui.success(
          `generated ${ui.bold(
            `${output.modules.length}`
          )} modules in ${ui.duration(duration)}`
        )
      );

      if (written.removed > 0) {
        console.log(
          ui.dim(
            `  ${written.removed} stale module${
              written.removed === 1 ? "" : "s"
            } removed`
          )
        );
      }
    }

    return {
      duration,
      modules: output.modules.length,
      success: true,
    };
  } finally {
    await loader.unregister();
  }
};
