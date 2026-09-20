import type {
  Compilation,
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
            "Make sure the route was evaluated against the generated",
            "Nooh introspection router.",
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

const getRoutes = (compilation: Compilation): readonly RouteModel[] =>
  compilation.model.routes;

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

  const routeMetadata = new Map<string, RouteMetadata>();

  for (const route of getRoutes(input.compilation)) {
    // biome-ignore lint/performance/noAwaitInLoops: ...
    const result = await introspectRoute(route, input.loader);

    diagnostics.push(...result.diagnostics);

    if (result.metadata) {
      routeMetadata.set(route.id, result.metadata);
    }
  }

  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return {
      diagnostics,
      introspection: null,
    };
  }

  return {
    diagnostics,
    introspection: {
      dependencies: {
        nodes: input.compilation.model.dependencies.nodes,
        order: input.compilation.model.dependencies.order,
      },

      routeDependencies: [...routeMetadata.entries()]
        .map(([routeId]) => ({
          closure: [],
          roots: [],
          routeId,
        }))
        .sort((a, b) => a.routeId.localeCompare(b.routeId)),
    },
  };
};
