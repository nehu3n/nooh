import { ensureLeadingSlash, normalizePath } from "@/path";
import type {
  Diagnostic,
  LoadedConfig,
  ParsedProject,
  ParsedRoute,
  ProjectModel,
  RouteGroup,
  RouteModel,
  RouteSegment,
} from "@/types";

const segmentToHono = (segment: RouteSegment): string => {
  // biome-ignore lint/style/useDefaultSwitchClause: ...
  switch (segment.kind) {
    case "static":
      return segment.value;

    case "param":
      return `:${segment.name}`;

    case "splat":
      return "*";
  }
};

const segmentsToPath = (segments: readonly RouteSegment[]): string => {
  if (segments.length === 0) {
    return "/";
  }

  return `/${segments.map(segmentToHono).join("/")}`;
};

const combinePaths = (groupPath: string, localPath: string): string => {
  const group = normalizePath(groupPath);
  const local = normalizePath(localPath);

  if (!group && local === "/") {
    return "/";
  }

  if (!group) {
    return ensureLeadingSlash(local);
  }

  if (local === "/") {
    return ensureLeadingSlash(group);
  }

  return ensureLeadingSlash(`${group}/${local}`);
};

const routeSegmentsToRouterPath = (
  groupPath: string,
  rawSegments: readonly string[]
): string => {
  const parts = [
    ...groupPath.split("/").filter(Boolean),
    ...rawSegments.filter(Boolean),
  ];

  return parts.length === 0 ? "router/index" : `router/${parts.join("/")}`;
};

const routeId = (route: ParsedRoute): string =>
  `${route.method.toUpperCase()} ${combinePaths(
    route.groupPath,
    segmentsToPath(route.segments)
  )}`;

const sortRoutes = (a: RouteModel, b: RouteModel): number => {
  const pathDifference = a.fullPath.localeCompare(b.fullPath);

  if (pathDifference !== 0) {
    return pathDifference;
  }

  const methodDifference = a.method.localeCompare(b.method);

  if (methodDifference !== 0) {
    return methodDifference;
  }

  return a.source.localeCompare(b.source);
};

export const analyze = (
  parsed: ParsedProject,
  config: LoadedConfig
): {
  model: ProjectModel;
  diagnostics: readonly Diagnostic[];
} => {
  const diagnostics: Diagnostic[] = [...parsed.diagnostics];

  const routeModels: RouteModel[] = [];
  const seen = new Map<string, string>();

  for (const route of parsed.routes) {
    const localPath = segmentsToPath(route.segments);
    const fullPath = combinePaths(route.groupPath, localPath);
    const id = routeId(route);

    const previousSource = seen.get(id);

    if (previousSource) {
      diagnostics.push({
        code: "NOOH005",
        file: route.source,
        message: [
          `Duplicate route "${id}".`,
          "",
          `First declaration: ${previousSource}`,
          `Second declaration: ${route.source}`,
        ].join("\n"),
        severity: "error",
      });

      continue;
    }

    seen.set(id, route.source);

    routeModels.push({
      fullPath,
      groupPath: normalizePath(route.groupPath),
      id,
      localPath,
      method: route.method,
      routerPath: routeSegmentsToRouterPath(route.groupPath, route.rawSegments),
      routeSegments: route.segments,
      source: route.source,
    });
  }

  routeModels.sort(sortRoutes);

  const groupMap = new Map<string, string[]>();

  for (const route of routeModels) {
    const existing = groupMap.get(route.groupPath);

    if (existing) {
      existing.push(route.id);
    } else {
      groupMap.set(route.groupPath, [route.id]);
    }
  }

  const groups: RouteGroup[] = [...groupMap.entries()]
    .map(([path, routes]) => ({
      id: path || "root",
      path: path ? ensureLeadingSlash(path) : "/",
      routes: [...routes].sort(),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  return {
    diagnostics,
    model: {
      config,
      groups,
      routes: routeModels,
    },
  };
};
