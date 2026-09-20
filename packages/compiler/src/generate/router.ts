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
  const functionName = METHOD_FUNCTION_NAMES[route.method];

  const prefix = functionName.charAt(0).toUpperCase() + functionName.slice(1);

  const path = JSON.stringify(ensureLeadingSlash(route.localPath));

  return [
    `type ${prefix}Path = ${path};`,
    "",
    `type ${prefix}RouteMiddleware = MiddlewareHandler<App, ${prefix}Path>;`,
    "",
    `type ${prefix}RouteHandler = Handler<App, ${prefix}Path, any, any>;`,
    "",
    `type ${prefix}RouteContext = Parameters<${prefix}RouteHandler>[0];`,
    "",
    `type ${prefix}RouteNext = Parameters<${prefix}RouteHandler>[1];`,
    "",
    "type StandardSchema = {",
    '  readonly "~standard": {',
    "    readonly validate: (...args: any[]) => any;",
    "    readonly types?: {",
    "      readonly input?: unknown;",
    "    };",
    "  };",
    "};",
    "",
    "type StandardSchemaInput<Schema extends StandardSchema> =",
    '  Schema["~standard"]["types"] extends {',
    "    readonly input?: infer Input;",
    "  }",
    "    ? Input",
    "    : unknown;",
    "",
    "type ValidationTarget =",
    '  | "json"',
    '  | "form"',
    '  | "query"',
    '  | "param"',
    '  | "header"',
    '  | "cookie";',
    "",
    "type ValidationOptions = Partial<",
    "  Record<ValidationTarget, StandardSchema>",
    ">;",
    "",
    "type ValidationEntry<",
    "  Target extends ValidationTarget,",
    "  Schema extends StandardSchema,",
    "> = undefined extends StandardSchemaInput<Schema>",
    "  ? {",
    "      readonly [Key in Target]?: StandardSchemaInput<Schema>;",
    "    }",
    "  : {",
    "      readonly [Key in Target]: StandardSchemaInput<Schema>;",
    "    };",
    "",
    "type UnionToIntersection<Union> =",
    "  (Union extends unknown",
    "    ? (value: Union) => void",
    "    : never) extends",
    "  (value: infer Intersection) => void",
    "    ? Intersection",
    "    : never;",
    "",
    `type ${prefix}ValidationInput<V extends ValidationOptions> =`,
    "  keyof V extends never",
    "    ? {}",
    "    : UnionToIntersection<{",
    "        [Target in keyof V & ValidationTarget]:",
    "          V[Target] extends StandardSchema",
    "            ? ValidationEntry<Target, V[Target]>",
    "            : never;",
    "      }[keyof V & ValidationTarget]>;",
    "",
    `type ${prefix}HandlerInput<`,
    "  D extends readonly RouteDependency[],",
    "  V extends ValidationOptions,",
    "> = {",
    `  readonly c: ${prefix}RouteContext;`,
    `  readonly next: ${prefix}RouteNext;`,
    "}",
    `  & ${prefix}ValidationInput<V>`,
    "  & DependencyContext<D>;",
    "",
    `type ${prefix}NoohHandler<`,
    "  D extends readonly RouteDependency[],",
    "  V extends ValidationOptions,",
    "> = (",
    `  input: ${prefix}HandlerInput<D, V>,`,
    `) => ReturnType<${prefix}RouteHandler>;`,
    "",
    `type ${prefix}EndpointOptions<`,
    "  D extends readonly RouteDependency[] = readonly RouteDependency[],",
    "  V extends ValidationOptions = ValidationOptions,",
    `  M extends readonly ${prefix}RouteMiddleware[] = readonly ${prefix}RouteMiddleware[],`,
    "> = {",
    "  readonly middleware?: M;",
    "  readonly validation?: V;",
    "  readonly deps?: D & ValidateDependencies<D, ReservedDependencyName>;",
    `  readonly handler: ${prefix}NoohHandler<D, V>;`,
    "};",
    "",
    `export function ${functionName}(`,
    `  handler: ${prefix}RouteHandler,`,
    `): readonly ${prefix}RouteHandler[];`,
    "",
    `export function ${functionName}<`,
    "  const D extends readonly RouteDependency[] = [],",
    "  const V extends ValidationOptions = {},",
    `  const M extends readonly ${prefix}RouteMiddleware[] = [],`,
    ">(",
    `  options: ${prefix}EndpointOptions<D, V, M>,`,
    `): readonly ${prefix}RouteHandler[];`,
    "",
    `export function ${functionName}(`,
    "  input:",
    `    | ${prefix}RouteHandler`,
    `    | ${prefix}EndpointOptions,`,
    `): readonly ${prefix}RouteHandler[] {`,
    "",
    '  if (typeof input === "function") {',
    "    return [input];",
    "  }",
    "",
    "  const dependencies = input.deps ?? [];",
    "",
    `  const handler: ${prefix}RouteHandler = (c, next) => {`,
    "    const dependencyContext =",
    "      createDependencyResolutionContext();",
    "",
    "    const resolvedDependencies =",
    "      resolveDependencies(",
    "        dependencies,",
    "        dependencyContext,",
    "      );",
    "",
    "    const valid =",
    "      c.req.valid as unknown as",
    "        (target: ValidationTarget) => unknown;",
    "",
    "    const validationInput =",
    "      Object.create(null) as Record<string, unknown>;",
    "",
    ...VALIDATION_TARGETS.flatMap((target) => [
      `    if (input.validation?.${target} !== undefined) {`,
      `      validationInput.${target} = valid(${JSON.stringify(target)});`,
      "    }",
      "",
    ]),
    "    return input.handler({",
    "      c,",
    "      next,",
    "      ...validationInput,",
    "      ...resolvedDependencies,",
    "    });",
    "  };",
    "",
    "  return [",
    `    ...((input.middleware ?? []) as readonly ${prefix}RouteHandler[]),`,
    ...VALIDATION_TARGETS.map(
      (target) =>
        `    ...(input.validation?.${target} !== undefined ? [sValidator(${JSON.stringify(
          target
        )}, input.validation.${target}) as ${prefix}RouteHandler] : []),`
    ),
    "    handler,",
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

  const dependencyModuleId = `${plan.outputRoot}/router/di.ts`;

  const code = [
    `import { sValidator } from "@hono/standard-validator";`,
    `import type { Handler, MiddlewareHandler } from "hono";`,
    "import {",
    "  createDependencyResolutionContext,",
    "  resolveDependencies,",
    `} from ${JSON.stringify(
      relativeModuleSpecifier(moduleId, dependencyModuleId)
    )};`,
    "import type {",
    "  AnyDependencyReference,",
    "  DependencyContext,",
    "  ValidateDependencies,",
    `} from "@nooh-ts/nooh";`,
    `import type { App } from ${JSON.stringify(
      relativeModuleSpecifier(moduleId, typesModuleId)
    )};`,
    "",
    "type RouteDependency = AnyDependencyReference;",
    "",
    "type ReservedDependencyName =",
    '  | "c"',
    '  | "next"',
    '  | "error"',
    "  | ValidationTarget;",
    "",
    ...routes.map(renderMethod),
  ].join("\n");

  return {
    code,
    id: moduleId,
    kind: "router",
  };
};
