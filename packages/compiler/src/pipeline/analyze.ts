import type {
  DependencyGraph,
  Diagnostic,
  LoadedConfig,
  ParsedProject,
  ParsedRoute,
  ProjectModel,
  RouteGroup,
  RouteModel,
  RouteSegment,
} from "@/types";
import { ensureLeadingSlash, normalizePath } from "@/utils/path";

const emptyDependencyGraph = (): DependencyGraph => ({
  nodes: new Map(),
  order: [],
  references: new Map(),
});

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
    return "";
  }

  return segments.map(segmentToHono).join("/");
};

const combinePaths = (groupPath: string, localPath: string): string => {
  const group = normalizePath(groupPath).replace(/^\/+|\/+$/g, "");
  const local = normalizePath(localPath).replace(/^\/+|\/+$/g, "");

  if (!(group || local)) {
    return "/";
  }

  if (!group) {
    return `/${local}`;
  }

  if (!local) {
    return `/${group}`;
  }

  return `/${group}/${local}`;
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

const parentGroupPath = (groupPath: string): string | null => {
  const normalized = normalizePath(groupPath);

  if (!normalized) {
    return null;
  }

  const parts = normalized.split("/").filter(Boolean);

  if (parts.length <= 1) {
    return "";
  }

  return parts.slice(0, -1).join("/");
};

const getAncestorGroupPaths = (groupPath: string): readonly string[] => {
  const parts = normalizePath(groupPath).split("/").filter(Boolean);

  return Array.from(
    {
      length: parts.length + 1,
    },
    (_, index) => parts.slice(0, index).join("/")
  );
};

const groupId = (path: string): string => path || "root";

const buildGroups = (
  parsed: ParsedProject,
  routeModels: readonly RouteModel[],
  diagnostics: Diagnostic[]
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: ...
): readonly RouteGroup[] => {
  const configSources = new Map<string, string>();

  for (const group of parsed.groups) {
    const path = normalizePath(group.groupPath);
    const previous = configSources.get(path);

    if (previous) {
      diagnostics.push({
        code: "NOOH006",
        file: group.source,
        message: [
          `Duplicate group definition for "${path || "/"}".`,
          "",
          `First declaration: ${previous}`,
          `Second declaration: ${group.source}`,
        ].join("\n"),
        severity: "error",
      });

      continue;
    }

    configSources.set(path, group.source);
  }

  const groupPaths = new Set<string>([""]);

  for (const group of parsed.groups) {
    for (const ancestor of getAncestorGroupPaths(group.groupPath)) {
      groupPaths.add(ancestor);
    }
  }

  for (const route of routeModels) {
    for (const ancestor of getAncestorGroupPaths(route.groupPath)) {
      groupPaths.add(ancestor);
    }
  }

  const routesByGroup = new Map<string, string[]>();

  for (const route of routeModels) {
    const routes = routesByGroup.get(route.groupPath);

    if (routes) {
      routes.push(route.id);
    } else {
      routesByGroup.set(route.groupPath, [route.id]);
    }
  }

  const childrenByGroup = new Map<string, string[]>();

  for (const path of groupPaths) {
    if (!path) {
      continue;
    }

    const parent = parentGroupPath(path) ?? "";

    const children = childrenByGroup.get(parent);

    if (children) {
      children.push(path);
    } else {
      childrenByGroup.set(parent, [path]);
    }
  }

  return [...groupPaths]
    .sort((a, b) => {
      if (!a && b) {
        return -1;
      }

      if (a && !b) {
        return 1;
      }

      return a.localeCompare(b);
    })
    .map((path) => {
      const children = [...(childrenByGroup.get(path) ?? [])].sort();
      const configSource = configSources.get(path);
      const parent = parentGroupPath(path);

      return {
        children: children.map(groupId),
        id: groupId(path),
        ...(parent !== null && {
          parentId: groupId(parent),
        }),
        path: path ? ensureLeadingSlash(path) : "/",
        routes: [...(routesByGroup.get(path) ?? [])].sort(),
        ...(configSource !== undefined && {
          configSource,
        }),
      };
    });
};

export const analyze = (
  parsed: ParsedProject,
  config: LoadedConfig,
  dependencies: DependencyGraph = emptyDependencyGraph()
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

  const groups = buildGroups(parsed, routeModels, diagnostics);

  return {
    diagnostics,
    model: {
      config,
      dependencies,
      groups,
      routeDependencies: [],
      routes: routeModels,
    },
  };
};
