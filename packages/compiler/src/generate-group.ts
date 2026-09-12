import { relativeModuleSpecifier } from "@/path";
import type {
  CompilationPlan,
  GeneratedModule,
  ProjectModel,
  RouteGroup,
  RouteModel,
} from "@/types";

const methodExpression = (method: RouteModel["method"]): string => method;

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

const groupModuleId = (plan: CompilationPlan, group: RouteGroup): string => {
  if (group.id === "root") {
    return `${plan.outputRoot}/groups/root.ts`;
  }

  return `${plan.outputRoot}/groups/${group.id}.ts`;
};

export const generateGroupModule = (
  plan: CompilationPlan,
  model: ProjectModel,
  group: RouteGroup
): GeneratedModule => {
  const moduleId = groupModuleId(plan, group);
  const typesModuleId = `${plan.outputRoot}/types.ts`;
  const routes = getGroupRoutes(model, group);

  const imports: string[] = [
    `import { Hono } from "hono";`,
    `import type { App } from ${JSON.stringify(
      relativeModuleSpecifier(moduleId, typesModuleId)
    )};`,
  ];

  const endpointImports: string[] = [];

  routes.forEach((route, index) => {
    const importName = `endpoint${index}`;

    endpointImports.push(
      `import ${importName} from ${JSON.stringify(
        relativeModuleSpecifier(moduleId, route.source)
      )};`
    );
  });

  const chain: string[] = ["", "const route = new Hono<App>()"];

  routes.forEach((route, index) => {
    chain.push(
      `  .${methodExpression(route.method)}(${JSON.stringify(
        route.localPath
      )}, ...endpoint${index})`
    );
  });

  chain.push(";", "", "export default route;", "");

  return {
    code: [...imports, ...endpointImports, ...chain].join("\n"),
    id: moduleId,
    kind: "group",
  };
};
