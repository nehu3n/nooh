import type {
  DiscoveredEndpoint,
  DiscoveredGroup,
  DiscoveredProject,
  LoadedConfig,
  SourceFile,
  SourceSnapshot,
} from "@/types";
import {
  basename,
  dirname,
  isPathInside,
  normalizePath,
  relativePath,
  toProjectPath,
} from "@/utils/path";

const DEFAULT_DEPENDENCIES_ROOT = "src/deps";

const ROUTE_FILE_PATTERN =
  /\.(get|post|put|patch|delete|options|head|all)\.(?:ts|tsx)$/;

const isTypeScriptFile = (file: SourceFile): boolean =>
  file.path.endsWith(".ts") || file.path.endsWith(".tsx");

const isRouteFile = (filePath: string): boolean =>
  ROUTE_FILE_PATTERN.test(filePath);

const isGroupFile = (filePath: string): boolean => {
  const filename = basename(filePath);

  return filename === "$.ts" || filename === "$.tsx";
};

const isDependencyFile = (filePath: string): boolean =>
  isPathInside(filePath, DEFAULT_DEPENDENCIES_ROOT);

const discoverDependency = (
  config: LoadedConfig,
  file: SourceFile
): SourceFile | null => {
  const source = toProjectPath(file.path, config.root);

  if (!isDependencyFile(source)) {
    return null;
  }

  return {
    content: file.content,
    path: source,
  };
};

const discoverGroup = (
  config: LoadedConfig,
  file: SourceFile
): DiscoveredGroup | null => {
  const source = toProjectPath(file.path, config.root);

  if (!isPathInside(source, config.routesRoot)) {
    return null;
  }

  if (!isGroupFile(source)) {
    return null;
  }

  const relative = relativePath(config.routesRoot, source);
  const directory = dirname(relative);

  return {
    groupPath: normalizePath(directory),
    source,
  };
};

const discoverEndpoint = (
  config: LoadedConfig,
  file: SourceFile
): DiscoveredEndpoint | null => {
  const source = toProjectPath(file.path, config.root);

  if (!isPathInside(source, config.routesRoot)) {
    return null;
  }

  if (!isRouteFile(source)) {
    return null;
  }

  const relative = relativePath(config.routesRoot, source);

  return {
    groupPath: normalizePath(dirname(relative)),
    localPath: normalizePath(basename(relative)),
    source,
  };
};

export const discover = (
  snapshot: SourceSnapshot,
  config: LoadedConfig
): DiscoveredProject => {
  const endpoints: DiscoveredEndpoint[] = [];
  const groups: DiscoveredGroup[] = [];
  const dependencies: SourceFile[] = [];

  for (const file of snapshot.files) {
    if (!isTypeScriptFile(file)) {
      continue;
    }

    const dependency = discoverDependency(config, file);

    if (dependency) {
      dependencies.push(dependency);
      continue;
    }

    const group = discoverGroup(config, file);

    if (group) {
      groups.push(group);
      continue;
    }

    const endpoint = discoverEndpoint(config, file);

    if (endpoint) {
      endpoints.push(endpoint);
    }
  }
  dependencies.sort((a, b) => a.path.localeCompare(b.path));

  endpoints.sort((a, b) => a.source.localeCompare(b.source));
  groups.sort((a, b) => a.source.localeCompare(b.source));

  return {
    config,
    dependencies,
    endpoints,
    groups,
  };
};
