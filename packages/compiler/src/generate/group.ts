import { groupModuleId } from "@/generate/utils";

import type {
  CompilationPlan,
  GeneratedModule,
  ProjectModel,
  RouteGroup,
  RouteModel,
} from "@/types";
import { ensureLeadingSlash, relativeModuleSpecifier } from "@/utils/path";

const getGroupRoutes = (
  model: ProjectModel,
  group: RouteGroup
): readonly RouteModel[] => {
  const ids = new Set(group.routes);

  return model.routes
    .filter((route) => ids.has(route.id))
    .sort((a, b) => {
      const pathDifference = a.localPath.localeCompare(b.localPath);

      if (pathDifference !== 0) {
        return pathDifference;
      }

      const methodDifference = a.method.localeCompare(b.method);

      if (methodDifference !== 0) {
        return methodDifference;
      }

      return a.source.localeCompare(b.source);
    });
};

export const generateGroupModule = (
  plan: CompilationPlan,
  model: ProjectModel,
  group: RouteGroup
): GeneratedModule => {
  const moduleId = groupModuleId(plan, group.id);
  const typesModuleId = `${plan.outputRoot}/types.ts`;
  const routes = getGroupRoutes(model, group);

  const imports = [
    `import { Hono } from "hono";`,
    `import type { App } from ${JSON.stringify(
      relativeModuleSpecifier(moduleId, typesModuleId)
    )};`,
  ];

  routes.forEach((route, index) => {
    imports.push(
      `import endpoint${index} from ${JSON.stringify(
        relativeModuleSpecifier(moduleId, route.source)
      )};`
    );
  });

  const chain = [
    "const route = new Hono<App>();",
    "",
    "const register = route.get as unknown as (",
    "  path: string,",
    "  ...handlers: any[]",
    ") => typeof route;",
    "",
  ];

  routes.forEach((route, index) => {
    chain.push(
      `register(${JSON.stringify(
        ensureLeadingSlash(route.localPath)
      )}, ...endpoint${index});`
    );
  });

  chain.push("", "export default route;", "");

  return {
    code: [...imports, "", ...chain].join("\n"),
    id: moduleId,
    kind: "group",
  };
};
