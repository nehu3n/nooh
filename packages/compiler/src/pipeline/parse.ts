import { parseEndpoint } from "@/pipeline/route-parser";
import type {
  Diagnostic,
  DiscoveredProject,
  ParsedGroup,
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

  const groups: ParsedGroup[] = project.groups.map((group) => ({
    groupPath: group.groupPath,
    source: group.source,
  }));

  routes.sort((a, b) => a.source.localeCompare(b.source));
  groups.sort((a, b) => a.source.localeCompare(b.source));

  return {
    diagnostics,
    groups,
    routes,
  };
};
