import { parseEndpoint } from "@/route-parser";
import type {
  Diagnostic,
  DiscoveredProject,
  ParsedProject,
  ParsedRoute,
} from "@/types";

export const parse = (project: DiscoveredProject): ParsedProject => {
  const routes: ParsedRoute[] = [];
  const diagnostics: Diagnostic[] = [];

  for (const endpoint of project.endpoints) {
    const result = parseEndpoint(endpoint);

    diagnostics.push(...result.diagnostics);

    if (result.route) {
      routes.push(result.route);
    }
  }

  routes.sort((a, b) => a.source.localeCompare(b.source));

  return {
    diagnostics,
    routes,
  };
};
