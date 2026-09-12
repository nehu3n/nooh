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

const capitalize = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

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

  group.configSources.forEach((source, index) => {
    imports.push(
      `import groupConfig${index} from ${JSON.stringify(
        relativeModuleSpecifier(moduleId, source)
      )};`
    );
  });

  routes.forEach((route, index) => {
    imports.push(
      `import endpoint${index} from ${JSON.stringify(
        relativeModuleSpecifier(moduleId, route.source)
      )};`
    );
  });

  const methods = [...new Set(routes.map((route) => route.method))].sort();

  const registerTypes = [
    "type RouteRegister = (",
    "  path: string,",
    "  ...handlers: any[]",
    ") => typeof route;",
  ];

  const registerDeclarations = methods.map((method) => {
    const name = `register${capitalize(method)}`;

    return [
      `const ${name} = route.${method} as unknown as RouteRegister;`,
    ].join("\n");
  });

  const registrations = routes.map((route, index) => {
    const register = `register${capitalize(route.method)}`;

    return `  ${register}(${JSON.stringify(
      ensureLeadingSlash(route.localPath)
    )}, ...endpoint${index});`;
  });

  const useDeclaration =
    group.configSources.length > 0
      ? [
          "",
          "type RouteUse = (",
          "  path: string,",
          "  ...handlers: any[]",
          ") => typeof route;",
          "",
          "const use = route.use as unknown as RouteUse;",
          "",
          "const groupMiddleware = [",
          ...group.configSources.map(
            (_, index) => `  ...(groupConfig${index}.middleware ?? []),`
          ),
          "];",
          "",
          "if (groupMiddleware.length > 0) {",
          '  use("*", ...groupMiddleware);',
          "}",
        ]
      : [];

  const code = [
    ...imports,
    "",
    "const route = new Hono<App>();",
    "",
    ...registerTypes,
    "",
    ...registerDeclarations,
    ...useDeclaration,
    "",
    ...registrations,
    "",
    "export default route;",
    "",
  ].join("\n");

  return {
    code,
    id: moduleId,
    kind: "group",
  };
};
