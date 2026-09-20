import type { CompilationPlan, GeneratedModule } from "@/types";

export const generateDependencyModule = (
  plan: CompilationPlan
): GeneratedModule => {
  const moduleId = `${plan.outputRoot}/router/di.ts`;

  const code = [
    "import type {",
    "  AnyDependencyReference,",
    "  DependencyResolutionContext,",
    '} from "@nooh-ts/nooh";',
    "",
    "export const createDependencyResolutionContext = (): DependencyResolutionContext => ({",
    "  cache: new Map<object, unknown>(),",
    "  resolving: new Set<object>(),",
    "  stack: [],",
    "});",
    "",
    "export const resolveDependencies = (",
    "  dependencies: readonly AnyDependencyReference[],",
    "  context: DependencyResolutionContext,",
    "): Record<string, unknown> => {",
    "  const resolved = Object.create(null) as Record<string, unknown>;",
    "",
    "  for (const dependency of dependencies) {",
    "    resolved[dependency.name] = dependency.resolve(context);",
    "  }",
    "",
    "  return resolved;",
    "};",
    "",
  ].join("\n");

  return {
    code,
    id: moduleId,
    kind: "di",
  };
};
