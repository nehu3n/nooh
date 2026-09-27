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
    `import type { MiddlewareHandler } from "hono";`,
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

  const registrations = [
    ...routes.map((route, index) => ({
      path: ensureLeadingSlash(route.localPath),
      value: `endpoint${index}`,
    })),
    ...children.map((child, index) => ({
      path: getChildPath(group, child),
      value: `child${index}`,
    })),
  ];

  const registrationCode =
    registrations.length === 0
      ? ["  return app;"]
      : [
          "  return app",
          ...registrations.map((registration, index) => {
            const suffix = index === registrations.length - 1 ? ";" : "";

            return `    .route(${JSON.stringify(
              registration.path
            )}, ${registration.value})${suffix}`;
          }),
        ];

  const code = [
    ...imports,
    "",
    "const route = (() => {",
    "  const app = new Hono<App>();",
    "",
    ...(group.configSource
      ? [
          "  for (const middleware of groupConfig.middleware ?? []) {",
          "    app.use(",
          '      "*",',
          "      middleware as MiddlewareHandler<App>",
          "    );",
          "  }",
          "",
          "  if (groupConfig.onError !== undefined) {",
          "    app.onError(",
          "      groupConfig.onError as Parameters<typeof app.onError>[0]",
          "    );",
          "  }",
          "",
        ]
      : []),
    ...registrationCode,
    "})();",
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
