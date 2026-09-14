import { readFile } from "node:fs/promises";

import {
  compile,
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

  const result = await compile({
    config: project.config,
    loader: {
      loadDefault: async (path) => {
        const module = await import(path);
        return module.default;
      },
    },
    options: {
      outputRoot: ".nooh",
    },
    root: project.root,
    sources: snapshot,
  });

  for (const diagnostic of result.diagnostics) {
    const location = diagnostic.file ? `${ui.dim(diagnostic.file)}: ` : "";

    if (diagnostic.severity === "error") {
      ui.error(`${location}${diagnostic.message}`);
    } else if (diagnostic.severity === "warning") {
      console.error(`${ui.warning(location)}${diagnostic.message}`);
    } else {
      console.log(`${ui.info(location)}${diagnostic.message}`);
    }
  }

  const duration = performance.now() - startedAt;

  if (!result.output) {
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

  const written = await writeOutput(project.root, result.output);

  if (!options.quiet) {
    console.log(
      ui.success(
        `generated ${ui.bold(
          `${result.output.modules.length}`
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
    modules: result.output.modules.length,
    success: true,
  };
};
