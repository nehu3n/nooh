import type { Diagnostic, ModuleLoader, RouteModel } from "@/types";

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
  loader: ModuleLoader
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
              ? ["Failed to introspect route:", error.message].join(" ")
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
            "The route must be loaded through a Nooh introspection router.",
          ].join(" "),
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

export const introspectRoutes = async (
  routes: readonly RouteModel[],
  loader: ModuleLoader
): Promise<{
  readonly diagnostics: readonly Diagnostic[];
  readonly routes: ReadonlyMap<string, RouteMetadata>;
}> => {
  const diagnostics: Diagnostic[] = [];

  const metadata = new Map<string, RouteMetadata>();

  for (const route of routes) {
    // biome-ignore lint/performance/noAwaitInLoops: ...
    const result = await introspectRoute(route, loader);

    diagnostics.push(...result.diagnostics);

    if (result.metadata) {
      metadata.set(route.id, result.metadata);
    }
  }

  return {
    diagnostics,
    routes: metadata,
  };
};
