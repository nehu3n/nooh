import type { CompilationPlan, GeneratedModule } from "@/types";

export const generateDependencyModule = (
  plan: CompilationPlan
): GeneratedModule => {
  const moduleId = `${plan.outputRoot}/router/di.ts`;

  const code = [
    "import type {",
    "  DependencyResolutionContext,",
    '} from "@nooh-ts/nooh";',
    "",

    "const requestContexts =",
    "  new WeakMap<object, DependencyResolutionContext>();",
    "",

    "export const createDependencyResolutionContext = (): DependencyResolutionContext => ({",
    "  cache: new Map<object, unknown>(),",
    "  resolving: new Set<object>(),",
    "  stack: [],",
    "});",
    "",

    "export const getDependencyResolutionContext = (",
    "  request: object,",
    "): DependencyResolutionContext => {",
    "  const existing = requestContexts.get(request);",
    "",
    "  if (existing) {",
    "    return existing;",
    "  }",
    "",
    "  const created = createDependencyResolutionContext();",
    "",
    "  requestContexts.set(request, created);",
    "",
    "  return created;",
    "};",
    "",
  ].join("\n");

  return {
    code,
    id: moduleId,
    kind: "di",
  };
};
