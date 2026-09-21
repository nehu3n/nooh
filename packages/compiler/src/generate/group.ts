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

const getGroup = (model: ProjectModel, id: string): RouteGroup | undefined =>
  model.groups.find((group) => group.id === id);

const getChildPath = (parent: RouteGroup, child: RouteGroup): string => {
  if (parent.path === "/") {
    return child.path;
  }

  const prefix = `${parent.path}/`;

  if (!child.path.startsWith(prefix)) {
    throw new Error(
      `Invalid group tree: "${child.path}" is not a child of "${parent.path}".`
    );
  }

  return child.path.slice(prefix.length);
};

export const generateGroupModule = (
  plan: CompilationPlan,
  model: ProjectModel,
  group: RouteGroup
): GeneratedModule => {
  const moduleId = groupModuleId(plan, group.id);
  const typesModuleId = `${plan.outputRoot}/types.ts`;
  const routes = getGroupRoutes(model, group);

  const children = group.children
    .map((childId) => getGroup(model, childId))
    .filter((child): child is RouteGroup => child !== undefined)
    .sort((a, b) => a.path.localeCompare(b.path));

  const imports = [
    `import { Hono } from "hono";`,
    `import type { App } from ${JSON.stringify(
      relativeModuleSpecifier(moduleId, typesModuleId)
    )};`,
  ];

  if (group.configSource) {
    imports.push(
      `import groupConfig from ${JSON.stringify(
        relativeModuleSpecifier(moduleId, group.configSource)
      )};`
    );
  }

  children.forEach((child, index) => {
    imports.push(
      `import child${index} from ${JSON.stringify(
        relativeModuleSpecifier(moduleId, groupModuleId(plan, child.id))
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

    return `const ${name} = route.${method} as unknown as RouteRegister;`;
  });

  const useDeclaration = group.configSource
    ? [
        "type RouteUse = (",
        "  path: string,",
        "  ...handlers: any[]",
        ") => typeof route;",
        "",
        "const use = route.use as unknown as RouteUse;",
        "",
        'use("*", ...(groupConfig.middleware ?? []));',
      ]
    : [];

  const routeRegistrations = routes.map((route, index) => {
    const register = `register${capitalize(route.method)}`;
    const path = JSON.stringify(ensureLeadingSlash(route.localPath));
    const endpointApp = `endpointApp${index}`;
    const endpointRegister = `registerEndpoint${index}`;

    return [
      `  if (endpoint${index}.onError === undefined) {`,
      `    ${register}(${path}, ...endpoint${index});`,
      "  } else {",
      `    const ${endpointApp} = new Hono<App>();`,
      `    ${endpointApp}.onError(`,
      `      endpoint${index}.onError as Parameters<typeof ${endpointApp}.onError>[0],`,
      "    );",
      `    const ${endpointRegister} = ${endpointApp}.${route.method} as unknown as RouteRegister;`,
      `    ${endpointRegister}(${path}, ...endpoint${index});`,
      `    route.route(${path}, ${endpointApp});`,
      "  }",
    ].join("\n");
  });

  const childRegistrations = children.map(
    (child, index) =>
      `  route.route(${JSON.stringify(
        getChildPath(group, child)
      )}, child${index});`
  );

  const groupErrorHandler = group.configSource
    ? [
        "",
        "if (groupConfig.onError !== undefined) {",
        "  route.onError(groupConfig.onError);",
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
    ...(useDeclaration.length > 0 ? ["", ...useDeclaration] : []),
    ...groupErrorHandler,
    ...(routeRegistrations.length > 0 ? ["", ...routeRegistrations] : []),
    ...(childRegistrations.length > 0 ? ["", ...childRegistrations] : []),
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
