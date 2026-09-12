import { readFile } from "node:fs/promises";

import {
  compile,
  type SourceFile,
  type SourceSnapshot,
} from "@nooh-ts/compiler";

import { writeOutput } from "@/output";
import { discoverProject } from "@/project";

export const build = async (): Promise<boolean> => {
  const project = await discoverProject();

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
    const prefix =
      diagnostic.severity === "error" ? "error" : diagnostic.severity;

    const file = diagnostic.file ? `${diagnostic.file}: ` : "";

    console.error(`[${prefix}] ${file}${diagnostic.message}`);
  }

  if (!result.output) {
    return false;
  }

  await writeOutput(project.root, result.output);

  console.log(`Generated ${result.output.modules.length} modules in .nooh`);

  return true;
};
