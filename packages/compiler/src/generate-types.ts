import { relativeModuleSpecifier } from "@/path";
import type { CompilationPlan, GeneratedModule, LoadedConfig } from "@/types";

export const generateTypesModule = (
  plan: CompilationPlan,
  config: LoadedConfig
): GeneratedModule => {
  const moduleId = `${plan.outputRoot}/types.ts`;

  const configImport = relativeModuleSpecifier(moduleId, config.source);

  const code = [
    `import type config from "${configImport}";`,
    "",
    "type ExtractEnvironment<T> = T extends {",
    "  readonly __nooh_env: infer Environment;",
    "}",
    "  ? Environment",
    "  : never;",
    "",
    "export type App = ExtractEnvironment<typeof config>;",
    "",
  ].join("\n");

  return {
    code,
    id: moduleId,
    kind: "types",
  };
};
