import type { Compilation, CompilationIntrospection } from "@/types";

export const finalizeCompilation = (
  compilation: Compilation,
  introspection: CompilationIntrospection
): Compilation => {
  if (!(compilation.plan && compilation.output)) {
    return compilation;
  }

  const model = {
    ...compilation.model,
    dependencies: introspection.dependencies,
    routeDependencies: introspection.routeDependencies,
  };

  const plan = {
    ...compilation.plan,
    dependencies: introspection.dependencies,
    routeDependencies: introspection.routeDependencies,
  };

  return {
    ...compilation,
    model,
    plan,
  };
};
