import type {
  CompilationPlan,
  GeneratedModule,
  ProjectModel,
  RouteModel,
} from "@/types";
import { relativeModuleSpecifier } from "@/utils/path";

const VALIDATION_TARGETS = [
  "json",
  "form",
  "query",
  "param",
  "header",
  "cookie",
] as const;

const getRoutesForRouter = (
  model: ProjectModel,
  routerPath: string
): readonly RouteModel[] =>
  model.routes
    .filter((route) => route.routerPath === routerPath)
    .sort((a, b) => a.method.localeCompare(b.method));

const renderValidationInput = (): string => {
  const inputs = VALIDATION_TARGETS.map(
    (target) =>
      `  & (${target} extends keyof V ? HandlerInput<ValidationHandler<"${target}", NonNullable<V[${JSON.stringify(target)}]>>> : {})`
  );

  return [
    "type ValidationInput<V extends ValidationOptions> =",
    ...inputs,
    ";",
  ].join("\n");
};

const renderValidationHandlers = (): string =>
  [
    "type ValidationHandlers<V extends ValidationOptions> = [",
    ...VALIDATION_TARGETS.map(
      (target) =>
        `  ...(V extends { readonly ${target}: infer Schema extends StandardSchema } ? [ValidationHandler<"${target}", Schema>] : []),`
    ),
    "];",
  ].join("\n");

const renderValidationCalls = (): string =>
  VALIDATION_TARGETS.map(
    (target) =>
      `    ...(input.validation?.${target} !== undefined ? [sValidator("${target}", input.validation.${target})] : []),`
  ).join("\n");

const renderMethod = (
  route: RouteModel,
  moduleId: string,
  typesModuleId: string
): string => {
  const methodName = route.method;
  const _typesImport = relativeModuleSpecifier(moduleId, typesModuleId);

  return [
    `type Path = ${JSON.stringify(route.fullPath)};`,
    "",
    "type RouteHandler = Handler<App, Path>;",
    "type RouteMiddleware = MiddlewareHandler<App, Path>;",
    "",
    "type ValidationTarget = Parameters<typeof sValidator>[0];",
    "type StandardSchema = Parameters<typeof sValidator>[1];",
    "",
    "type ValidationOptions = Partial<",
    "  Record<ValidationTarget, StandardSchema>",
    ">;",
    "",
    "type HandlerInput<T> = T extends H<",
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
    renderValidationInput(),
    "",
    renderValidationHandlers(),
    "",
    "type EndpointOptions<",
    "  M extends readonly RouteMiddleware[],",
    "  V extends ValidationOptions,",
    "  R extends HandlerResponse<any>,",
    "> = {",
    "  readonly middleware?: M;",
    "  readonly validation?: V;",
    "  readonly handler: Handler<",
    "    App,",
    "    Path,",
    "    ValidationInput<V>,",
    "    R",
    "  >;",
    "};",
    "",
    `export function ${methodName}<R extends HandlerResponse<any>>(`,
    "  handler: Handler<App, Path, {}, R>,",
    "): readonly [Handler<App, Path, {}, R>];",
    "",
    `export function ${methodName}<`,
    "  M extends readonly RouteMiddleware[],",
    "  V extends ValidationOptions,",
    "  R extends HandlerResponse<any>,",
    ">(",
    "  options: EndpointOptions<M, V, R>,",
    "): readonly [",
    "  ...M,",
    "  ...ValidationHandlers<V>,",
    "  Handler<App, Path, ValidationInput<V>, R>,",
    "];",
    "",
    `export function ${methodName}<`,
    "  M extends readonly RouteMiddleware[],",
    "  V extends ValidationOptions,",
    "  R extends HandlerResponse<any>,",
    ">(",
    "  input:",
    "    | Handler<App, Path, {}, R>",
    "    | EndpointOptions<M, V, R>,",
    "): readonly Handler<App, Path, any, any>[] {",
    '  if (typeof input === "function") {',
    "    return [input];",
    "  }",
    "",
    "  return [",
    "    ...(input.middleware ?? []),",
    renderValidationCalls(),
    "    input.handler,",
    "  ];",
    "}",
    "",
  ]
    .join("\n")
    .replace("import type App", "import type App");
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
      "import type {",
      "  H,",
      "  Handler,",
      "  HandlerResponse,",
      "  MiddlewareHandler,",
      `} from "hono";`,
      `import type { App } from ${JSON.stringify(
        relativeModuleSpecifier(moduleId, typesModuleId)
      )};`,
      "",
      ...routes.map((route) => renderMethod(route, moduleId, typesModuleId)),
    ].join("\n"),
    id: moduleId,
    kind: "router",
  };
};
