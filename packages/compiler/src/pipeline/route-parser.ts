import type {
  Diagnostic,
  DiscoveredEndpoint,
  ParsedRoute,
  RouteSegment,
} from "@/types";
import { ROUTE_METHODS } from "@/types";
import { normalizePath } from "@/utils/path";

const METHOD_PATTERN =
  /^(.*)\.(get|post|put|patch|delete|options|head|all)\.(?:ts|tsx)$/;

const PARAM_PATTERN = /^\[([A-Za-z0-9_]+)\]$/;
const SPLAT_PATTERN = /^\[\.\.\.([A-Za-z0-9_]+)\]$/;

const methodSet = new Set<string>(ROUTE_METHODS);

const parseSegment = (
  segment: string
):
  | { segment: RouteSegment; error?: undefined }
  | {
      segment?: undefined;
      error: Diagnostic;
    } => {
  const parameter = segment.match(PARAM_PATTERN);

  if (parameter?.[1]) {
    return {
      segment: {
        kind: "param",
        name: parameter[1],
      },
    };
  }

  const splat = segment.match(SPLAT_PATTERN);

  if (splat?.[1]) {
    return {
      segment: {
        kind: "splat",
        name: splat[1],
      },
    };
  }

  if (segment.includes("[") || segment.includes("]")) {
    return {
      error: {
        code: "NOOH003",
        message: `Invalid route segment "${segment}".`,
        severity: "error",
      },
    };
  }

  if (!segment) {
    return {
      error: {
        code: "NOOH004",
        message: "Route segments cannot be empty.",
        severity: "error",
      },
    };
  }

  return {
    segment: {
      kind: "static",
      value: segment,
    },
  };
};

export const parseEndpoint = (
  endpoint: DiscoveredEndpoint
): {
  route?: ParsedRoute;
  diagnostics: readonly Diagnostic[];
} => {
  const localParts = endpoint.localPath.split("/").filter(Boolean);
  const filename = localParts.pop();

  if (!filename) {
    return {
      diagnostics: [
        {
          code: "NOOH001",
          file: endpoint.source,
          message: "Invalid empty endpoint filename.",
          severity: "error",
        },
      ],
    };
  }

  const match = filename.match(METHOD_PATTERN);

  if (!match) {
    return {
      diagnostics: [
        {
          code: "NOOH001",
          file: endpoint.source,
          message: 'Invalid endpoint filename. Expected "<name>.<method>.ts".',
          severity: "error",
        },
      ],
    };
  }

  const [_match, routeFile, method] = match;

  if (!(method && methodSet.has(method))) {
    return {
      diagnostics: [
        {
          code: "NOOH002",
          file: endpoint.source,
          message: `Unsupported HTTP method "${method}".`,
          severity: "error",
        },
      ],
    };
  }

  const validMethod = method as ParsedRoute["method"];

  const routeFileSegments = routeFile?.split("/").filter(Boolean) || [];
  const rawSegments = [...localParts, ...routeFileSegments];

  const last = rawSegments.at(-1);
  const effectiveSegments =
    last === "index" ? rawSegments.slice(0, -1) : rawSegments;

  const diagnostics: Diagnostic[] = [];
  const segments: RouteSegment[] = [];

  for (const rawSegment of effectiveSegments) {
    const result = parseSegment(rawSegment);

    if (result.error) {
      diagnostics.push({
        ...result.error,
        file: endpoint.source,
      });

      continue;
    }

    segments.push(result.segment);
  }

  if (diagnostics.length > 0) {
    return {
      diagnostics,
    };
  }

  return {
    diagnostics: [],
    route: {
      groupPath: normalizePath(endpoint.groupPath),
      method: validMethod,
      rawSegments: effectiveSegments,
      segments,
      source: endpoint.source,
    },
  };
};
