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
    "const contexts = new WeakMap<",
    "  object,",
    "  DependencyResolutionContext,",
    ">();",
    "",
    "export const getDependencyResolutionContext = (",
    "  owner: object,",
    "): DependencyResolutionContext => {",
    "  const existing = contexts.get(owner);",
    "",
    "  if (existing) {",
    "    return existing;",
    "  }",
    "",
    "  const context: DependencyResolutionContext = {",
    "    cache: new Map<object, unknown>(),",
    "    resolving: new Set<object>(),",
    "    stack: [],",
    "  };",
    "",
    "  contexts.set(owner, context);",
    "",
    "  return context;",
    "};",
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
