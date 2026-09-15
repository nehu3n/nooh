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

  for (const file of snapshot.files) {
    if (!isTypeScriptFile(file)) {
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

  endpoints.sort((a, b) => a.source.localeCompare(b.source));
  groups.sort((a, b) => a.source.localeCompare(b.source));

  return {
    config,
    endpoints,
    groups,
  };
};
