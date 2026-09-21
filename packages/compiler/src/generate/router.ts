import type {
  CompilationPlan,
  GeneratedModule,
  ProjectModel,
  RouteDependencyModel,
  RouteModel,
} from "@/types";
import { ensureLeadingSlash, relativeModuleSpecifier } from "@/utils/path";

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

export type RouterGenerationMode = "runtime" | "introspection";

const getRoutesForRouter = (
  model: ProjectModel,
  routerPath: string
): readonly RouteModel[] =>
  model.routes
    .filter((route) => route.routerPath === routerPath)
    .sort((a, b) => a.method.localeCompare(b.method));

const getRouteDependencyModel = (
  model: ProjectModel,
  routeId: string
): RouteDependencyModel | undefined =>
  model.routeDependencies.find((route) => route.routeId === routeId);

const getDependencyNames = (
  model: ProjectModel,
  route: RouteModel
): readonly string[] => {
  const dependencyModel = getRouteDependencyModel(model, route.id);

  if (!dependencyModel) {
    return [];
  }

  return dependencyModel.roots.map((dependencyId) => {
    const node = model.dependencies.nodes.get(dependencyId);

    if (!node) {
      throw new Error(
        [
          "Nooh internal error:",
          `dependency "${dependencyId}"`,
          `for route "${route.id}" is missing`,
          "from the dependency graph.",
        ].join(" ")
      );
    }

    return node.declaration.name;
  });
};

const renderMethod = (
  model: ProjectModel,
  route: RouteModel,
  mode: RouterGenerationMode
): string => {
  const functionName = METHOD_FUNCTION_NAMES[route.method];

  const prefix = functionName.charAt(0).toUpperCase() + functionName.slice(1);

  const path = JSON.stringify(ensureLeadingSlash(route.localPath));
  const routeLabel = JSON.stringify(
    `${route.method.toUpperCase()} ${ensureLeadingSlash(route.localPath)}`
  );

  const dependencyNames = getDependencyNames(model, route);

  const validationTargetType =
    route.method === "get" || route.method === "head"
      ? `Exclude<NoohRequestValidationTarget, "json" | "form">`
      : "NoohRequestValidationTarget";

  const common = [
    `type ${prefix}Path = ${path};`,
    "",
    `type ${prefix}RouteMiddleware = MiddlewareHandler<App, ${prefix}Path>;`,
    "",
    `type ${prefix}RouteHandler = Handler<App, ${prefix}Path, any, any>;`,
    "",
    `type ${prefix}RouteContext<V extends ${prefix}ValidationOptions> =`,
    `  Context<App, ${prefix}Path, ${prefix}ValidationInput<V>>;`,
    "",
    `type ${prefix}RouteNext = Parameters<${prefix}RouteHandler>[1];`,
    "",
    `type ${prefix}RouteErrorHandler = NoohErrorHandler<App, ${prefix}Path>;`,
    "",
    `type ${prefix}ValidationTarget = ${validationTargetType};`,
    "",

    `type ${prefix}ValidationOptions =`,
    "  Partial<Record<",
    `    ${prefix}ValidationTarget,`,
    "    NoohStandardSchema,",
    "  >> & {",
    "    readonly response?: NoohStandardSchema;",
    "  };",
    "",

    `type ${prefix}ValidationEntry<`,
    `  Target extends ${prefix}ValidationTarget,`,
    "  Schema extends NoohStandardSchema,",
    "> = undefined extends NoohStandardSchemaInput<Schema>",
    "  ? {",
    "      readonly in: {",
    "        readonly [Key in Target]?: NoohStandardSchemaInput<Schema>;",
    "      };",
    "      readonly out: {",
    "        readonly [Key in Target]: NoohStandardSchemaOutput<Schema>;",
    "      };",
    "    }",
    "  : {",
    "      readonly in: {",
    "        readonly [Key in Target]: NoohStandardSchemaInput<Schema>;",
    "      };",
    "      readonly out: {",
    "        readonly [Key in Target]: NoohStandardSchemaOutput<Schema>;",
    "      };",
    "    };",
    "",

    `type ${prefix}ValidationInput<V extends ${prefix}ValidationOptions> =`,
    "  keyof V extends never",
    "    ? {}",
    "    : UnionToIntersection<{",
    `        [Target in keyof V & ${prefix}ValidationTarget]:`,
    "          V[Target] extends NoohStandardSchema",
    "            ? ",
    `              ${prefix}ValidationEntry<Target, V[Target]>`,
    "            : never;",
    "      }[keyof V &",
    `        ${prefix}ValidationTarget]>;`,
    "",
    `type ${prefix}ResponseSchema<V extends ${prefix}ValidationOptions> =`,
    "  V extends {",
    "    readonly response: infer Schema extends NoohStandardSchema;",
    "  }",
    "    ? Schema",
    "    : never;",
    "",
    `type ${prefix}NoohHandlerReturn<V extends ${prefix}ValidationOptions> =`,
    "  V extends {",
    "    readonly response: infer Schema extends NoohStandardSchema;",
    "  }",
    "    ? Response &",
    "        TypedResponse<",
    "          NoohStandardSchemaInput<Schema>,",
    "          any,",
    "          any,",
    "        >",
    "      | Promise<",
    "          Response &",
    "            TypedResponse<",
    "              NoohStandardSchemaInput<Schema>,",
    "              any,",
    "              any,",
    "            >",
    "        >",
    `    : ReturnType<${prefix}RouteHandler>;`,
    "",
    `type ${prefix}HandlerInput<`,
    "  D extends readonly RouteDependency[],",
    `  V extends ${prefix}ValidationOptions,`,
    "  E extends ErrorDefinitions,",
    "> = {",
    `  readonly c: ${prefix}RouteContext<V>;`,
    `  readonly next: ${prefix}RouteNext;`,
    "}",
    "  & DependencyContext<D>",
    "  & (",
    "      keyof E extends never",
    "        ? {}",
    "        : { readonly errors: ErrorContext<E> }",
    "    );",
    "",
    `type ${prefix}NoohHandler<`,
    "  D extends readonly RouteDependency[],",
    `  V extends ${prefix}ValidationOptions,`,
    "  E extends ErrorDefinitions,",
    "> = (",
    `  input: ${prefix}HandlerInput<D, V, E>,`,
    `) => ${prefix}NoohHandlerReturn<V>;`,
    "",
    `type ${prefix}RouteHandlers = readonly ${prefix}RouteHandler[] & {`,
    `  readonly onError?: ${prefix}RouteErrorHandler;`,
    "};",
    "",

    `type ${prefix}EndpointOptions<`,
    "  D extends readonly RouteDependency[] = readonly RouteDependency[],",
    `  V extends ${prefix}ValidationOptions = ${prefix}ValidationOptions,`,
    `  M extends readonly ${prefix}RouteMiddleware[] = readonly ${prefix}RouteMiddleware[],`,
    "  E extends ErrorDefinitions = {},",
    "> = {",
    "  readonly middleware?: M;",
    "  readonly validation?: V;",
    "  readonly deps?: D & ValidateDependencies<D, ReservedDependencyName>;",
    "  readonly errors?: E;",
    `  readonly onError?: ${prefix}RouteErrorHandler;`,
    `  readonly handler: ${prefix}NoohHandler<D, V, E>;`,
    "};",
    "",

    `export function ${functionName}(`,
    `  handler: ${prefix}RouteHandler,`,
    `): ${prefix}RouteHandlers;`,
    "",
    `export function ${functionName}<`,
    "  const D extends readonly RouteDependency[] = [],",
    `  const V extends ${prefix}ValidationOptions = {},`,
    `  const M extends readonly ${prefix}RouteMiddleware[] = [],`,
    "  const E extends ErrorDefinitions = {},",
    ">(",
    `  options: ${prefix}EndpointOptions<D, V, M, E>,`,
    `): ${prefix}RouteHandlers;`,
    "",
    `export function ${functionName}(`,
    "  input:",
    `    | ${prefix}RouteHandler`,
    `    | ${prefix}EndpointOptions,`,
    `): ${prefix}RouteHandlers {`,
  ];

  if (mode === "introspection") {
    return [
      ...common,
      "",
      '  if (typeof input === "function") {',
      "    return defineRouteMetadata(",
      "      [input],",
      "      [],",
      "    ) as unknown as",
      `      ${prefix}RouteHandlers;`,
      "  }",
      "",
      "  return defineRouteMetadata(",
      `    [input.handler as unknown as ${prefix}RouteHandler],`,
      "    input.deps ?? [],",
      "  ) as unknown as",
      `    ${prefix}RouteHandlers;`,
      "}",
      "",
    ].join("\n");
  }

  const dependencyResolution = dependencyNames.flatMap((_, index) => [
    `    const resolvedDependency${index} = dependencies[${index}]!.resolve(dependencyContext);`,
  ]);

  const dependencyProperties = dependencyNames.map(
    (name, index) =>
      `      ${JSON.stringify(name)}: resolvedDependency${index},`
  );

  return [
    ...common,
    "",
    '  if (typeof input === "function") {',
    `    return defineRouteHandlers<${prefix}Path>([input]);`,
    "  }",
    "",
    "  const dependencies = input.deps ?? [];",
    "",
    "  const errors =",
    "    input.errors === undefined",
    "      ? undefined",
    "      : createErrorContext(input.errors);",
    "",

    `  const handler: ${prefix}RouteHandler = async (c, next) => {`,
    ...(dependencyNames.length > 0
      ? [
          "    const dependencyContext =",
          "      getDependencyResolutionContext(c);",
          "",
          ...dependencyResolution,
          "",
        ]
      : []),

    "    const response = await input.handler({",
    "      c: c as unknown as",
    `        ${prefix}RouteContext<${prefix}ValidationOptions>,`,
    "      next,",
    ...(dependencyNames.length > 0 ? dependencyProperties : []),
    "      ...(errors !== undefined ? { errors } : {}),",
    "    });",
    "",

    "    if (input.validation?.response !== undefined) {",
    "      return validateResponse(",
    "        response as Response,",
    "        input.validation.response,",
    `        ${routeLabel},`,
    "      );",
    "    }",
    "",
    "    return response;",
    "  };",
    "",
    "  const handlers = [",
    `    ...((input.middleware ?? []) as readonly ${prefix}RouteHandler[]),`,
    ...(["json", "form", "query", "param", "header", "cookie"] as const).map(
      (target) =>
        `    ...(input.validation?.${target} !== undefined ? [validatorEngine(${JSON.stringify(
          target
        )}, input.validation.${target}) as ${prefix}RouteHandler] : []),`
    ),
    "    handler,",
    "  ] as const;",
    "",
    `  return defineRouteHandlers<${prefix}Path>(handlers, input.onError);`,
    "}",
    "",
  ].join("\n");
};

const COMMON_TYPES = [
  "type RouteDependency = AnyDependencyReference;",
  "",
  "type ErrorDefinitions = Record<string, ErrorConstructor>;",
  "",
  "type UnionToIntersection<Union> =",
  "  (Union extends unknown",
  "    ? (value: Union) => void",
  "    : never) extends",
  "  (value: infer Intersection) => void",
  "    ? Intersection",
  "    : never;",
  "",
  "type ReservedDependencyName =",
  '  | "c"',
  '  | "next"',
  '  | "error"',
  '  | "errors"',
  '  | "onError"',
  '  | "response"',
  "  | NoohValidationTarget;",
];

export const generateRouterModule = (
  plan: CompilationPlan,
  model: ProjectModel,
  routerPath: string,
  mode: RouterGenerationMode = "runtime"
): GeneratedModule => {
  const routes = getRoutesForRouter(model, routerPath);

  const moduleId = `${plan.outputRoot}/${routerPath}.ts`;

  const typesModuleId = `${plan.outputRoot}/types.ts`;

  const dependencyModuleId = `${plan.outputRoot}/router/di.ts`;

  const errorModuleId = `${plan.outputRoot}/error.ts`;

  const configModuleId = model.config.source;

  const usesDependencies =
    mode === "runtime" &&
    routes.some((route) => {
      const dependencyModel = getRouteDependencyModel(model, route.id);

      return !!dependencyModel?.roots.length;
    });

  const imports: string[] = [
    "import type {",
    "  Context,",
    "  Handler,",
    "  MiddlewareHandler,",
    "  TypedResponse,",
    `} from "hono";`,
    "import type {",
    "  AnyDependencyReference,",
    "  DependencyContext,",
    "  ErrorContext,",
    "  ErrorConstructor,",
    "  NoohErrorHandler,",
    "  NoohRequestValidationTarget,",
    "  NoohStandardSchema,",
    "  NoohStandardSchemaInput,",
    "  NoohStandardSchemaOutput,",
    "  NoohValidationTarget,",
    "  ValidateDependencies,",
    '} from "@nooh-ts/nooh";',
    `import type { App } from ${JSON.stringify(
      relativeModuleSpecifier(moduleId, typesModuleId)
    )};`,
  ];

  if (mode === "runtime") {
    imports.unshift(
      `import { sValidator } from "@hono/standard-validator";`,
      `import config from ${JSON.stringify(
        relativeModuleSpecifier(moduleId, configModuleId)
      )};`,
      `import { validateResponse } from ${JSON.stringify(
        relativeModuleSpecifier(moduleId, errorModuleId)
      )};`
    );
  }

  if (usesDependencies) {
    imports.push(
      "import {",
      "  getDependencyResolutionContext,",
      `} from ${JSON.stringify(
        relativeModuleSpecifier(moduleId, dependencyModuleId)
      )};`
    );
  }

  const prelude: string[] = ["", ...COMMON_TYPES];

  if (mode === "runtime") {
    prelude.push(
      "",
      "const validatorEngine = (",
      "  config.validator?.engine ?? sValidator,",
      ") as unknown as (",
      "  target: NoohRequestValidationTarget,",
      "  schema: NoohStandardSchema,",
      ") => unknown;"
    );
  }

  if (mode === "runtime") {
    prelude.push(
      "",
      "const createErrorContext = <",
      "  const E extends ErrorDefinitions,",
      ">(",
      "  definitions: E | undefined,",
      "): ErrorContext<E> => {",
      "  const errors: Record<string, unknown> = {};",
      "",
      "  if (definitions === undefined) {",
      "    return errors as ErrorContext<E>;",
      "  }",
      "",
      "  for (const [name, Constructor] of Object.entries(definitions)) {",
      "    errors[name] = (...args: unknown[]) =>",
      "      Reflect.construct(Constructor, args);",
      "  }",
      "",
      "  return errors as ErrorContext<E>;",
      "};",
      "",
      "const defineRouteHandlers = <",
      "  const P extends string,",
      "  const T extends readonly Handler<App, P, any, any>[],",
      ">(",
      "  handlers: T,",
      "  onError?: NoohErrorHandler<App, P>,",
      "): T & { readonly onError?: NoohErrorHandler<App, P> } => {",
      "  if (onError !== undefined) {",
      '    Object.defineProperty(handlers, "onError", {',
      "      configurable: false,",
      "      enumerable: false,",
      "      value: onError,",
      "      writable: false,",
      "    });",
      "  }",
      "",
      "  return handlers as T & {",
      "    readonly onError?: NoohErrorHandler<App, P>;",
      "  };",
      "};"
    );
  }

  if (mode === "introspection") {
    prelude.push(
      "",
      'const NOOH_ROUTE_METADATA = Symbol.for("nooh.route");',
      "",
      "type NoohRouteMetadata = {",
      '  readonly kind: "route";',
      "  readonly dependencies: readonly RouteDependency[];",
      "};",
      "",
      "const defineRouteMetadata = <",
      "  T extends readonly unknown[],",
      ">(",
      "  handlers: T,",
      "  dependencies: readonly RouteDependency[],",
      "): T => {",
      "  const metadata: NoohRouteMetadata = {",
      '    kind: "route",',
      "    dependencies,",
      "  };",
      "",
      "  Object.defineProperty(",
      "    handlers,",
      "    NOOH_ROUTE_METADATA,",
      "    {",
      "      value: metadata,",
      "      enumerable: false,",
      "    },",
      "  );",
      "",
      "  return handlers;",
      "};"
    );
  }

  const code = [
    ...imports,
    ...prelude,
    "",
    ...routes.map((route) => renderMethod(model, route, mode)),
  ].join("\n");

  return {
    code,
    id: moduleId,
    kind: "router",
  };
};
