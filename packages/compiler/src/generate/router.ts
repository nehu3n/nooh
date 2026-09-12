import type {
  CompilationPlan,
  GeneratedModule,
  ProjectModel,
  RouteModel,
} from "@/types";
import { ensureLeadingSlash, relativeModuleSpecifier } from "@/utils/path";

const VALIDATION_TARGETS = [
  "json",
  "form",
  "query",
  "param",
  "header",
  "cookie",
] as const;

const METHOD_FUNCTION_NAMES: Record<RouteModel["method"], string> = {
  all: "all",
  delete: "del",
  get: "get",
  head: "head",
  options: "options",
  patch: "patch",
  post: "post",
  put: "put",
};

const getRoutesForRouter = (
  model: ProjectModel,
  routerPath: string
): readonly RouteModel[] =>
  model.routes
    .filter((route) => route.routerPath === routerPath)
    .sort((a, b) => a.method.localeCompare(b.method));

const renderMethod = (route: RouteModel): string => {
  const { method } = route;
  const functionName = METHOD_FUNCTION_NAMES[method];

  const path = JSON.stringify(ensureLeadingSlash(route.localPath));

  return [
    `type Path = ${path};`,
    "",
    "type RouteMiddleware = MiddlewareHandler<App, Path>;",
    "",
    "type ValidationTarget = Parameters<typeof sValidator>[0];",
    "type StandardSchema = Parameters<typeof sValidator>[1];",
    "",
    "type ValidationOptions = Partial<",
    "  Record<ValidationTarget, StandardSchema>",
    ">;",
    "",
    "type HandlerInput<T> = T extends Handler<",
    "  any,",
    "  any,",
    "  infer I,",
    "  any",
    "> ? I : never;",
    "",
    "type ValidationHandler<",
    "  Target extends ValidationTarget,",
    "  Schema extends StandardSchema,",
    "> = ReturnType<",
    "  typeof sValidator<Schema, Target, App, Path>",
    ">;",
    "",
    "type ValidationInput<V extends ValidationOptions> =",
    ...VALIDATION_TARGETS.map(
      (target) =>
        `  & (${JSON.stringify(target)} extends keyof V ? HandlerInput<ValidationHandler<${JSON.stringify(target)}, NonNullable<V[${JSON.stringify(target)}]>>> : {})`
    ),
    ";",
    "",
    "type RouteHandler = Handler<App, Path, any, any>;",
    "",
    "type EndpointOptions<",
    "  M extends readonly RouteMiddleware[],",
    "  V extends ValidationOptions,",
    "  H extends Handler<App, Path, ValidationInput<V>>,",
    "> = {",
    "  readonly middleware?: M;",
    "  readonly validation?: V;",
    "  readonly handler: H;",
    "};",
    "",
    `export function ${functionName}<H extends Handler<App, Path>>(`,
    "  handler: H,",
    "): readonly RouteHandler[];",
    "",
    `export function ${functionName}<`,
    "  M extends readonly RouteMiddleware[],",
    "  V extends ValidationOptions,",
    "  H extends Handler<App, Path, ValidationInput<V>>,",
    ">(",
    "  options: EndpointOptions<M, V, H>,",
    "): readonly RouteHandler[];",
    "",
    `export function ${functionName}<`,
    "  M extends readonly RouteMiddleware[],",
    "  V extends ValidationOptions,",
    "  H extends Handler<App, Path, ValidationInput<V>>,",
    ">(",
    "  input:",
    "    | H",
    "    | EndpointOptions<M, V, H>,",
    "): readonly RouteHandler[] {",
    '  if (typeof input === "function") {',
    "    return [input as RouteHandler];",
    "  }",
    "",
    "  return [",
    "    ...(input.middleware ?? []) as readonly RouteHandler[],",
    ...VALIDATION_TARGETS.map(
      (target) =>
        `    ...(input.validation?.${target} !== undefined ? [sValidator(${JSON.stringify(target)}, input.validation.${target}) as RouteHandler] : []),`
    ),
    "    input.handler as RouteHandler,",
    "  ];",
    "}",
    "",
  ].join("\n");
};

export const generateRouterModule = (
  plan: CompilationPlan,
  model: ProjectModel,
  routerPath: string
): GeneratedModule => {
  const routes = getRoutesForRouter(model, routerPath);

  const moduleId = `${plan.outputRoot}/${routerPath}.ts`;

  const typesModuleId = `${plan.outputRoot}/types.ts`;

  return {
    code: [
      `import { sValidator } from "@hono/standard-validator";`,
      `import type { Handler, MiddlewareHandler } from "hono";`,
      `import type { App } from ${JSON.stringify(
        relativeModuleSpecifier(moduleId, typesModuleId)
      )};`,
      "",
      ...routes.map(renderMethod),
    ].join("\n"),
    id: moduleId,
    kind: "router",
  };
};
