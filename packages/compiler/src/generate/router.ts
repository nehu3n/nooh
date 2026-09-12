import type {
  CompilationPlan,
  GeneratedModule,
  ProjectModel,
  RouteModel,
} from "@/types";
import { relativeModuleSpecifier } from "@/utils/path";

const methodExportName = (method: RouteModel["method"]): string =>
  method === "delete" ? "del" : method;

const getRoutesForRouter = (
  model: ProjectModel,
  routerPath: string
): readonly RouteModel[] =>
  model.routes
    .filter((route) => route.routerPath === routerPath)
    .sort((a, b) => a.method.localeCompare(b.method));

const renderMethod = (
  route: RouteModel,
  moduleId: string,
  typesModuleId: string
): string => {
  const name = methodExportName(route.method);

  const typesImport = relativeModuleSpecifier(moduleId, typesModuleId);

  const lines = [
    `type RouteHandler = Handler<App, ${JSON.stringify(route.fullPath)}>;`,
    `type RouteMiddleware = MiddlewareHandler<App, ${JSON.stringify(route.fullPath)}>;`,
    "",
    "type EndpointOptions<",
    "  HandlerType extends RouteHandler,",
    "  MiddlewareType extends readonly RouteMiddleware[],",
    "> = {",
    "  readonly middleware?: MiddlewareType;",
    "  readonly handler: HandlerType;",
    "};",
    "",
    `export function ${name}<HandlerType extends RouteHandler>(`,
    "  handler: HandlerType,",
    "): readonly [HandlerType];",
    "",
    `export function ${name}<`,
    "  HandlerType extends RouteHandler,",
    "  MiddlewareType extends readonly RouteMiddleware[],",
    ">(",
    "  options: EndpointOptions<HandlerType, MiddlewareType>,",
    "): readonly [...MiddlewareType, HandlerType];",
    "",
    `export function ${name}<`,
    "  HandlerType extends RouteHandler,",
    "  MiddlewareType extends readonly RouteMiddleware[],",
    ">(",
    "  input:",
    "    | HandlerType",
    "    | EndpointOptions<HandlerType, MiddlewareType>,",
    "): readonly [HandlerType] | readonly [...MiddlewareType, HandlerType] {",
    '  if (typeof input === "function") {',
    "    return [input];",
    "  }",
    "",
    "  return [",
    "    ...(input.middleware ?? []),",
    "    input.handler,",
    "  ] as readonly [...MiddlewareType, HandlerType];",
    "}",
  ];

  return [
    `import type { Handler, MiddlewareHandler } from "hono";`,
    `import type { App } from ${JSON.stringify(typesImport)};`,
    "",
    ...lines,
  ].join("\n");
};

export const generateRouterModule = (
  plan: CompilationPlan,
  model: ProjectModel,
  routerPath: string
): GeneratedModule => {
  const routes = getRoutesForRouter(model, routerPath);

  const relativeRouterPath = routerPath;
  const moduleId = `${plan.outputRoot}/${relativeRouterPath}.ts`;
  const typesModuleId = `${plan.outputRoot}/types.ts`;

  const code = [
    ...routes.map((route) => renderMethod(route, moduleId, typesModuleId)),
    "",
  ].join("\n");

  return {
    code,
    id: moduleId,
    kind: "router",
  };
};
