import type { CompileInput, ConfigLoadResult, RuntimeConfig } from "@/types";
import { normalizePath, toProjectPath } from "@/utils/path";

const DEFAULT_DEPENDENCIES_ROOT = "src/deps";
const DEFAULT_ROUTES_ROOT = "src/routes";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isString = (value: unknown): value is string => typeof value === "string";

const isFunction = (value: unknown): value is (...args: never[]) => unknown =>
  typeof value === "function";

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

  const dependenciesValue = defaultExport.dependencies;

  if (dependenciesValue !== undefined && !isString(dependenciesValue)) {
    return {
      diagnostics: [
        {
          code: "NOOH013",
          file: input.config,
          message: 'The Nooh config "dependencies" option must be a string.',
          severity: "error",
        },
      ],
    };
  }

  const validatorValue = defaultExport.validator;

  if (validatorValue !== undefined && !isRecord(validatorValue)) {
    return {
      diagnostics: [
        {
          code: "NOOH014",
          file: input.config,
          message: 'The Nooh config "validator" option must be an object.',
          severity: "error",
        },
      ],
    };
  }

  if (
    isRecord(validatorValue) &&
    validatorValue.engine !== undefined &&
    !isFunction(validatorValue.engine)
  ) {
    return {
      diagnostics: [
        {
          code: "NOOH015",
          file: input.config,
          message:
            'The Nooh config "validator.engine" option must be a function.',
          severity: "error",
        },
      ],
    };
  }

  const root = normalizePath(input.root ?? "");
  const source = toProjectPath(input.config, root);
  const routes = routesValue ?? DEFAULT_ROUTES_ROOT;
  const dependencies = dependenciesValue ?? DEFAULT_DEPENDENCIES_ROOT;
  const routesRoot = toProjectPath(routes, root);
  const dependenciesRoot = toProjectPath(dependencies, root);

  const value: RuntimeConfig = {
    dependencies: dependenciesValue,
    routes: routesValue,
  };

  return {
    config: {
      dependenciesRoot,
      root,
      routesRoot,
      source,
      value,
    },
    diagnostics: [],
  };
};
