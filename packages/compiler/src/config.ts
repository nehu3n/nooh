import { normalizePath } from "@/path";
import type { CompileInput, LoadedConfig, RuntimeConfig } from "@/types";

const DEFAULT_ROUTES_ROOT = "src/routes";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isString = (value: unknown): value is string => typeof value === "string";

export const loadConfig = async (
  input: CompileInput
): Promise<LoadedConfig> => {
  const defaultExport = await input.loader.loadDefault(input.config);

  if (!isRecord(defaultExport)) {
    throw new Error(
      `Nooh config "${input.config}" must default-export an object.`
    );
  }

  const routesValue = defaultExport.routes;

  if (routesValue !== undefined && !isString(routesValue)) {
    throw new Error(
      `Nooh config "${input.config}" has an invalid "routes" option.`
    );
  }

  const value: RuntimeConfig = {
    routes: routesValue,
  };

  return {
    routesRoot: normalizePath(routesValue ?? DEFAULT_ROUTES_ROOT),
    source: normalizePath(input.config),
    value,
  };
};
