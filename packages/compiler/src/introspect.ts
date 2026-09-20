import {
  dependencyClosure,
  loadDependencyGraph,
} from "@/pipeline/dependencies";

import type {
  CompilationIntrospection,
  Diagnostic,
  IntrospectionInput,
  IntrospectionResult,
  RouteModel,
} from "@/types";

export const NOOH_ROUTE_METADATA: unique symbol = Symbol.for("nooh.route");

export interface RouteMetadata {
  readonly dependencies: readonly unknown[];
  readonly kind: "route";
}

const isRecord = (value: unknown): value is Record<PropertyKey, unknown> =>
  typeof value === "object" && value !== null;

const isRouteMetadata = (value: unknown): value is RouteMetadata => {
  if (!isRecord(value)) {
    return false;
  }

  return value.kind === "route" && Array.isArray(value.dependencies);
};

export const readRouteMetadata = (value: unknown): RouteMetadata | null => {
  if (!isRecord(value)) {
    return null;
  }

  const metadata = value[NOOH_ROUTE_METADATA];

  return isRouteMetadata(metadata) ? metadata : null;
};

export const introspectRoute = async (
  route: RouteModel,
  loader: IntrospectionInput["loader"]
): Promise<{
  readonly diagnostics: readonly Diagnostic[];
  readonly metadata?: RouteMetadata;
}> => {
  let exported: unknown;

  try {
    exported = await loader.loadDefault(route.source);
  } catch (error) {
    return {
      diagnostics: [
        {
          code: "NOOH031",
          file: route.source,
          message:
            error instanceof Error
              ? `Failed to introspect route: ${error.message}`
              : "Failed to introspect route.",
          severity: "error",
        },
      ],
    };
  }

  const metadata = readRouteMetadata(exported);

  if (!metadata) {
    return {
      diagnostics: [
        {
          code: "NOOH032",
          file: route.source,
          message: [
            "The route did not expose Nooh route metadata.",
            "",
            "Make sure the route is evaluated against the generated",
            "Nooh router helpers.",
          ].join("\n"),
          severity: "error",
        },
      ],
    };
  }

  return {
    diagnostics: [],
    metadata,
  };
};

const unknownDependencyDiagnostic = (
  route: RouteModel,
  dependency: unknown
): Diagnostic => ({
  code: "NOOH034",
  file: route.source,
  message:
    isRecord(dependency) && typeof dependency.name === "string"
      ? [
          `Route "${route.id}" references unknown dependency`,
          `"${dependency.name}".`,
        ].join(" ")
      : `Route "${route.id}" contains an invalid dependency reference.`,
  severity: "error",
});

export const introspectCompilation = async (
  input: IntrospectionInput
): Promise<IntrospectionResult> => {
  if (!input.compilation.plan) {
    return {
      diagnostics: [
        {
          code: "NOOH033",
          message:
            "Cannot introspect a compilation without a compilation plan.",
          severity: "error",
        },
      ],
      introspection: null,
    };
  }

  const diagnostics: Diagnostic[] = [];

  const dependencyResult = await loadDependencyGraph(
    input.dependencySources,
    input.loader
  );

  diagnostics.push(...dependencyResult.diagnostics);

  const routeDependencies = new Map<
    string,
    {
      readonly roots: readonly string[];
      readonly closure: readonly string[];
    }
  >();

  for (const route of input.compilation.model.routes) {
    // biome-ignore lint/performance/noAwaitInLoops: ...
    const result = await introspectRoute(route, input.loader);

    diagnostics.push(...result.diagnostics);

    if (!result.metadata) {
      continue;
    }

    const roots: string[] = [];

    for (const dependency of result.metadata.dependencies) {
      if (typeof dependency !== "object" || dependency === null) {
        diagnostics.push(unknownDependencyDiagnostic(route, dependency));

        continue;
      }

      const id = dependencyResult.graph.references.get(dependency);

      if (!id) {
        diagnostics.push(unknownDependencyDiagnostic(route, dependency));
        continue;
      }

      if (!roots.includes(id)) {
        roots.push(id);
      }
    }

    const closure = dependencyClosure(dependencyResult.graph, roots);

    routeDependencies.set(route.id, {
      closure,
      roots: [...roots].sort(),
    });
  }

  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return {
      diagnostics,
      introspection: null,
    };
  }

  const result: CompilationIntrospection = {
    dependencies: dependencyResult.graph,

    routeDependencies: [...routeDependencies.entries()]
      .map(([routeId, value]) => ({
        closure: value.closure,
        roots: value.roots,
        routeId,
      }))
      .sort((a, b) => a.routeId.localeCompare(b.routeId)),
  };

  return {
    diagnostics,
    introspection: result,
  };
};
