import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { compile } from "@nooh-ts/compiler";
import { createJiti } from "jiti";

import { writeOutput } from "@/output";
import { discoverProject } from "@/project";
import type { NoohUnpluginOptions } from "@/types";

export interface CompileResult {
  readonly success: boolean;
}

export const compileProject = async (
  options: Required<NoohUnpluginOptions>
): Promise<CompileResult> => {
  const project = await discoverProject(options.root);

  const files = await Promise.all(
    project.files.map(async (path) => ({
      content: await readFile(path, "utf8"),
      path,
    }))
  );

  const jiti = createJiti(pathToFileURL(project.config).href);

  const result = await compile({
    config: project.config,

    loader: {
      loadDefault: async (path) => {
        const module = await jiti.import(path);

        if (
          typeof module === "object" &&
          module !== null &&
          "default" in module
        ) {
          return module.default;
        }

        return module;
      },
    },

    options: {
      outputRoot: options.outputRoot,
    },
    root: project.root,

    sources: {
      files,
    },
  });

  if (result.diagnostics.length > 0) {
    const errors = result.diagnostics.filter(
      (diagnostic) => diagnostic.severity === "error"
    );

    if (errors.length > 0) {
      const message = errors
        .map((diagnostic) => {
          const file = diagnostic.file ? `${diagnostic.file}: ` : "";

          return `${file}${diagnostic.message}`;
        })
        .join("\n\n");

      throw new Error(message);
    }
  }

  if (!result.output) {
    return {
      success: false,
    };
  }

  await writeOutput(project.root, result.output);

  return {
    success: true,
  };
};
