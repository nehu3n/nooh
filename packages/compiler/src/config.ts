import { normalizePath } from "@/path";
import type {
  CompileInput,
  Diagnostic,
  LoadedConfig,
  RuntimeConfig,
} from "@/types";

const DEFAULT_ROUTES_ROOT = "src/routes";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isString = (value: unknown): value is string => typeof value === "string";

export interface ConfigLoadResult {
  readonly config?: LoadedConfig;
  readonly diagnostics: readonly Diagnostic[];
}

export const loadConfig = async (
  input: CompileInput
): Promise<ConfigLoadResult> => {
  let defaultExport: unknown;

  try {
    defaultExport = await input.loader.loadDefault(input.config);
  } catch (error) {
    return {
      diagnostics: [
        {
          code: "NOOH010",
          file: input.config,
          message:
            error instanceof Error
              ? `Failed to load config: ${error.message}`
              : "Failed to load config.",
          severity: "error",
        },
      ],
    };
  }

  if (!isRecord(defaultExport)) {
    return {
      diagnostics: [
        {
          code: "NOOH011",
          file: input.config,
          message: "The Nooh config default export must be an object.",
          severity: "error",
        },
      ],
    };
  }

  const routesValue = defaultExport.routes;

  if (routesValue !== undefined && !isString(routesValue)) {
    return {
      diagnostics: [
        {
          code: "NOOH012",
          file: input.config,
          message: 'The Nooh config "routes" option must be a string.',
          severity: "error",
        },
      ],
    };
  }

  const value: RuntimeConfig = {
    routes: routesValue,
  };

  return {
    config: {
      routesRoot: normalizePath(routesValue ?? DEFAULT_ROUTES_ROOT),
      source: normalizePath(input.config),
      value,
    },
    diagnostics: [],
  };
};
