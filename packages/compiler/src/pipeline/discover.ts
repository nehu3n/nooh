import type {
  DiscoveredEndpoint,
  DiscoveredProject,
  LoadedConfig,
  SourceFile,
  SourceSnapshot,
} from "@/types";
import { isPathInside, normalizePath, relativePath } from "@/utils/path";

const isTypeScriptFile = (file: SourceFile): boolean =>
  file.path.endsWith(".ts") || file.path.endsWith(".tsx");

export const findEndpointsDirectory = (
  routesRoot: string,
  filePath: string
): string | null => {
  const relative = relativePath(routesRoot, filePath);
  const parts = relative.split("/").filter(Boolean);

  const endpointIndex = parts.lastIndexOf("endpoints");

  if (endpointIndex === -1) {
    return null;
  }

  const groupParts = parts.slice(0, endpointIndex);

  return normalizePath(
    [routesRoot, ...groupParts, "endpoints"].filter(Boolean).join("/")
  );
};

const discoverEndpoint = (
  config: LoadedConfig,
  file: SourceFile
): DiscoveredEndpoint | null => {
  const relative = relativePath(config.routesRoot, file.path);
  const parts = relative.split("/").filter(Boolean);

  const endpointIndex = parts.lastIndexOf("endpoints");

  if (endpointIndex === -1) {
    return null;
  }

  const endpointsRoot = normalizePath(
    [config.routesRoot, ...parts.slice(0, endpointIndex), "endpoints"].join("/")
  );

  const groupParts = parts.slice(0, endpointIndex);
  const localParts = parts.slice(endpointIndex + 1);

  if (localParts.length === 0) {
    return null;
  }

  return {
    endpointsRoot,
    groupPath: normalizePath(groupParts.join("/")),
    localPath: normalizePath(localParts.join("/")),
    source: normalizePath(file.path),
  };
};

export const discover = (
  snapshot: SourceSnapshot,
  config: LoadedConfig
): DiscoveredProject => {
  const endpoints: DiscoveredEndpoint[] = [];

  for (const file of snapshot.files) {
    const normalizedFile = normalizePath(file.path);

    if (!isTypeScriptFile(file)) {
      continue;
    }

    if (!isPathInside(normalizedFile, config.routesRoot)) {
      continue;
    }

    const endpoint = discoverEndpoint(config, file);

    if (endpoint) {
      endpoints.push(endpoint);
    }
  }

  endpoints.sort((a, b) => a.source.localeCompare(b.source));

  return {
    config,
    endpoints,
  };
};
