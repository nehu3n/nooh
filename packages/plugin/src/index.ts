import {
  createUnplugin,
  type UnpluginFactory,
  type UnpluginInstance,
} from "unplugin";

import { compileProject } from "@/compiler";
import { resolveNoohId } from "@/resolve";

// biome-ignore lint/style/noExportedImports: ...
import type { NoohUnpluginOptions } from "@/types";

const DEFAULT_OPTIONS: Required<NoohUnpluginOptions> = {
  config: "src/config.ts",
  outputRoot: ".nooh",
  root: process.cwd(),
};

const normalizeOptions = (
  options?: NoohUnpluginOptions
): { config: string; outputRoot: string; root: string } => ({
  config: options?.config ?? DEFAULT_OPTIONS.config,
  outputRoot: options?.outputRoot ?? DEFAULT_OPTIONS.outputRoot,
  root: options?.root ?? DEFAULT_OPTIONS.root,
});

const FILTER_ID_REGEX = /^@(?:router|middleware)\//;

export const unpluginFactory: UnpluginFactory<
  NoohUnpluginOptions | undefined
> = (options) => {
  const resolved = normalizeOptions(options);

  let compiling: Promise<void> = Promise.resolve();

  const rebuild = async (): Promise<void> => {
    const current = compiling.then(async () => {
      await compileProject(resolved);
    });

    compiling = current.catch(() => undefined);

    await current;
  };

  return {
    async buildStart() {
      await rebuild();
    },

    enforce: "pre",
    name: "nooh",

    resolveId: {
      filter: {
        id: FILTER_ID_REGEX,
      },

      handler(id) {
        return resolveNoohId(resolved.root, id);
      },
    },

    vite: {
      configResolved(config) {
        if (options?.root !== undefined) {
          return;
        }

        resolved.root = config.root;
      },
    },

    async watchChange() {
      await rebuild();
    },
  };
};

export const nooh: UnpluginInstance<NoohUnpluginOptions | undefined, boolean> =
  /* #__PURE__ */
  createUnplugin(unpluginFactory);

export type { NoohUnpluginOptions };
