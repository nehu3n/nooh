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

const renderMethod = (
  route: RouteModel,
  _moduleId: string,
  _typesModuleId: string
): string => {
  const path = JSON.stringify(route.fullPath);

  return [
    `type Path = ${path};`,
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
    "type ValidationInput<V extends ValidationOptions> =",
    ...VALIDATION_TARGETS.map((target) => `  ${target} extends keyof V`),
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

  const blocks = routes.map((route) =>
    renderMethod(route, moduleId, typesModuleId)
  );

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
      ...blocks,
      "",
    ].join("\n"),
    id: moduleId,
    kind: "router",
  };
};
