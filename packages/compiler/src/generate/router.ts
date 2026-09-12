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

const renderMethod = (route: RouteModel): string => {
  const { method } = route;
  const path = JSON.stringify(route.fullPath);

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
    "type ValidationInput<V extends ValidationOptions> =",
    ...VALIDATION_TARGETS.map(
      (target) =>
        `  & (${target} extends keyof V ? HandlerInput<ValidationHandler<"${target}", NonNullable<V[${JSON.stringify(target)}]>>> : {})`
    ),
    ";",
    "",
    "type ValidationHandlers<V extends ValidationOptions> = [",
    ...VALIDATION_TARGETS.map(
      (target) =>
        `  ...(V extends { readonly ${target}: infer Schema extends StandardSchema } ? [ValidationHandler<"${target}", Schema>] : []),`
    ),
    "];",
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
    `export function ${method}<H extends Handler<App, Path>>(`,
    "  handler: H,",
    "): readonly [H];",
    "",
    `export function ${method}<`,
    "  M extends readonly RouteMiddleware[],",
    "  V extends ValidationOptions,",
    "  H extends Handler<App, Path, ValidationInput<V>>,",
    ">(",
    "  options: EndpointOptions<M, V, H>,",
    "): readonly [",
    "  ...M,",
    "  ...ValidationHandlers<V>,",
    "  H,",
    "];",
    "",
    `export function ${method}<`,
    "  M extends readonly RouteMiddleware[],",
    "  V extends ValidationOptions,",
    "  H extends Handler<App, Path, ValidationInput<V>>,",
    ">(",
    "  input:",
    "    | H",
    "    | EndpointOptions<M, V, H>,",
    "): readonly HonoHandler[] {",
    '  if (typeof input === "function") {',
    "    return [input];",
    "  }",
    "",
    "  return [",
    "    ...(input.middleware ?? []),",
    ...VALIDATION_TARGETS.map(
      (target) =>
        `    ...(input.validation?.${target} !== undefined ? [sValidator("${target}", input.validation.${target})] : []),`
    ),
    "    input.handler,",
    "  ];",
    "}",
    "",
    "type HonoHandler = H<App, Path, any, any>;",
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
      `import type { H, Handler, MiddlewareHandler } from "hono";`,
      `import type { App } from ${JSON.stringify(
        relativeModuleSpecifier(moduleId, typesModuleId)
      )};`,
      "",
      ...routes.map((route) => renderMethod(route)),
    ].join("\n"),
    id: moduleId,
    kind: "router",
  };
};
