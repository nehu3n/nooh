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

  const path = JSON.stringify(ensureLeadingSlash(route.fullPath));
  const routeLabel = JSON.stringify(
    `${route.method.toUpperCase()} ${ensureLeadingSlash(route.fullPath)}`
  );

  const dependencyNames = getDependencyNames(model, route);

  const validationTargets = [
    "json",
    "form",
    "query",
    "param",
    "header",
    "cookie",
  ] as const;

  const common = [
    `type ${prefix}Path = ${path};`,
    "",
    `type ${prefix}RouteMiddleware = MiddlewareHandler<App, ${prefix}Path>;`,
    "",
    `type ${prefix}RouteHandler = Handler<App, ${prefix}Path, {}, any>;`,
    "",

    `type ${prefix}ValidationSchemaMap = Record<`,
    "  NoohRequestValidationTarget,",
    "  NoohStandardSchema",
    ">;",
    "",

    `type ${prefix}ValidationOptions = Partial<${prefix}ValidationSchemaMap> & {`,
    "  readonly response?: NoohStandardSchema;",
    "};",
    "",

    `type ${prefix}ValidationEntry<`,
    "  Target extends NoohRequestValidationTarget,",
    "  Schema extends NoohStandardSchema",
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
    "        [Target in keyof V & NoohRequestValidationTarget]:",
    "          V[Target] extends NoohStandardSchema",
    "            ? ",
    `              ${prefix}ValidationEntry<Target, V[Target]>`,
    "            : never",
    "      }[keyof V &",
    "        NoohRequestValidationTarget]>;",
    "",

    `type ${prefix}RouteContext<V extends ${prefix}ValidationOptions> =`,
    "  Context<",
    "    App,",
    `    ${prefix}Path,`,
    `    ${prefix}ValidationInput<V>`,
    "  >;",
    "",

    `type ${prefix}RouteNext = Parameters<${prefix}RouteHandler>[1];`,
    "",

    `type ${prefix}RouteErrorHandler = NoohErrorHandler<App, ${prefix}Path>;`,
    "",

    `type ${prefix}ValidateResponseValue<`,
    "  ResponseType,",
    "  Schema extends NoohStandardSchema",
    "> =",
    "  ResponseType extends Response &",
    "    TypedResponse<",
    "      infer Data,",
    "      infer Status,",
    "      infer Format",
    "    >",
    "    ? Data extends NoohStandardSchemaInput<Schema>",
    "      ? ResponseType",
    "      : never",
    "    : never;",
    "",

    `type ${prefix}ValidateHandlerReturn<`,
    "  R extends HandlerResponse<unknown>,",
    `  V extends ${prefix}ValidationOptions`,
    "> =",
    "  V extends {",
    "    readonly response: infer Schema extends NoohStandardSchema",
    "  }",
    "    ? R extends Promise<infer ResponseType>",
    "      ? Promise<",
    `          ${prefix}ValidateResponseValue<`,
    "            ResponseType,",
    "            Schema",
    "          >",
    "        >",
    `      : ${prefix}ValidateResponseValue<R, Schema>`,
    "    : R;",
    "",

    `type ${prefix}RuntimeHandlerReturn<`,
    "  R extends HandlerResponse<unknown>,",
    `  V extends ${prefix}ValidationOptions`,
    "> =",
    "  V extends {",
    "    readonly response: infer Schema extends NoohStandardSchema",
    "  }",
    "    ? R extends Promise<infer ResponseType>",
    "      ? Promise<",
    `          ${prefix}ValidateResponseValue<`,
    "            ResponseType,",
    "            Schema",
    "          >",
    "        >",
    `      : ${prefix}ValidateResponseValue<R, Schema>`,
    "    : R;",
    "",

    `type ${prefix}MergeTypedResponse<ResponseType> =`,
    "  ResponseType extends Promise<void>",
    "    ? ResponseType",
    "    : ResponseType extends Promise<infer Value>",
    "      ? Value extends TypedResponse",
    "        ? Value",
    "        : TypedResponse",
    "      : ResponseType extends TypedResponse",
    "        ? ResponseType",
    "        : TypedResponse;",
    "",

    `type ${prefix}EndpointSchema<`,
    "  I extends Input,",
    "  R extends HandlerResponse<unknown>",
    "> = ToSchema<",
    `  ${JSON.stringify(route.method)},`,
    '  "/",',
    "  I,",
    `  ${prefix}MergeTypedResponse<R>`,
    ">;",
    "",

    `type ${prefix}EndpointApp<`,
    "  I extends Input,",
    "  R extends HandlerResponse<unknown>",
    "> = Hono<",
    "  App,",
    `  ${prefix}EndpointSchema<I, R>`,
    ">;",
    "",

    `type ${prefix}HandlerInput<`,
    "  D extends readonly RouteDependency[],",
    `  V extends ${prefix}ValidationOptions,`,
    "  E extends ErrorDefinitions",
    "> = {",
    `  readonly c: ${prefix}RouteContext<V>;`,
    `  readonly next: ${prefix}RouteNext;`,
    "} & DependencyContext<D> & (",
    "  keyof E extends never",
    "    ? {}",
    "    : { readonly errors: ErrorContext<E> }",
    ");",
    "",

    `type ${prefix}NoohHandlerReturn<`,
    "  R extends HandlerResponse<unknown>,",
    `  V extends ${prefix}ValidationOptions`,
    "> = R &",
    `  ${prefix}ValidateHandlerReturn<R, V>;`,
    "",

    `type ${prefix}NoohHandler<`,
    "  D extends readonly RouteDependency[],",
    `  V extends ${prefix}ValidationOptions,`,
    "  E extends ErrorDefinitions,",
    "  R extends HandlerResponse<unknown>",
    "> = (",
    `  input: ${prefix}HandlerInput<D, V, E>`,
    `) => ${prefix}NoohHandlerReturn<R, V>;`,
    "",

    `type ${prefix}EndpointOptions<`,
    "  D extends readonly RouteDependency[] = readonly RouteDependency[],",
    `  V extends ${prefix}ValidationOptions = ${prefix}ValidationOptions,`,
    `  M extends readonly ${prefix}RouteMiddleware[] = readonly ${prefix}RouteMiddleware[],`,
    "  E extends ErrorDefinitions = {},",
    "  R extends HandlerResponse<unknown> = HandlerResponse<unknown>",
    "> = {",
    "  readonly middleware?: M;",
    "  readonly validation?: V;",
    "  readonly deps?: D & ValidateDependencies<D, ReservedDependencyName>;",
    "  readonly errors?: E;",
    `  readonly onError?: ${prefix}RouteErrorHandler;`,
    `  readonly handler: ${prefix}NoohHandler<D, V, E, R>;`,
    "};",
    "",

    `export function ${functionName}<`,
    "  const R extends HandlerResponse<unknown> = HandlerResponse<unknown>",
    ">(",
    `  handler: Handler<App, ${prefix}Path, {}, R>`,
    `): ${prefix}EndpointApp<{}, R>;`,
    "",

    `export function ${functionName}<`,
    "  const D extends readonly RouteDependency[] = [],",
    `  const V extends ${prefix}ValidationOptions = {},`,
    `  const M extends readonly ${prefix}RouteMiddleware[] = [],`,
    "  const E extends ErrorDefinitions = {},",
    "  const R extends HandlerResponse<unknown> = HandlerResponse<unknown>",
    ">(",
    `  options: ${prefix}EndpointOptions<D, V, M, E, R>`,
    "):",
    `  ${prefix}EndpointApp<`,
    `    ${prefix}ValidationInput<V>,`,
    `    ${prefix}RuntimeHandlerReturn<R, V>`,
    "  >;",
    "",
    `export function ${functionName}(`,
    "  input:",
    `    | ${prefix}RouteHandler`,
    `    | ${prefix}EndpointOptions`,
    "): Hono<App> {",
  ];

  if (mode === "introspection") {
    return [
      ...common,
      "",
      "  const endpoint = new Hono<App>();",
      "",
      "  return defineRouteMetadata(",
      "    endpoint,",
      '    typeof input === "function" ? [] : input.deps ?? []',
      "  );",
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
    "    const endpoint = new Hono<App>();",
    "",
    `    endpoint.${route.method}(`,
    '      "/",',
    "      input as unknown as Handler<",
    "        App,",
    '        "/",',
    "        {},",
    "        HandlerResponse<unknown>",
    "      >",
    "    );",
    "",
    "    return endpoint;",
    "  }",
    "",

    "  const endpoint = new Hono<App>();",
    "",

    "  if (input.onError !== undefined) {",
    "    endpoint.onError(",
    "      input.onError as Parameters<typeof endpoint.onError>[0]",
    "    );",
    "  }",
    "",

    "  for (const middleware of input.middleware ?? []) {",
    "    endpoint.use(",
    '      "*",',
    "      middleware as MiddlewareHandler<App>",
    "    );",
    "  }",
    "",

    ...validationTargets.flatMap((target) => [
      `  if (input.validation?.${target} !== undefined) {`,
      "    endpoint.use(",
      '      "*",',
      `      validatorEngine(${JSON.stringify(target)}, input.validation.${target})`,
      "    );",
      "  }",
      "",
    ]),

    `  const handler = (c: ${prefix}RouteContext<${prefix}ValidationOptions>, next: ${prefix}RouteNext) => {`,
    ...(dependencyNames.length > 0
      ? [
          "    const dependencyContext =",
          "      getDependencyResolutionContext(c);",
          "",
          ...dependencyResolution,
          "",
        ]
      : []),

    "    const errors =",
    "      input.errors === undefined",
    "        ? undefined",
    "        : createErrorContext(input.errors);",
    "",

    "    const result = input.handler({",
    "      c,",
    "      next,",
    ...(dependencyNames.length > 0 ? dependencyProperties : []),
    "      ...(errors !== undefined ? { errors } : {})",
    "    });",
    "",

    "    if (input.validation?.response !== undefined) {",
    "      if (result instanceof Promise) {",
    "        return result.then((response) =>",
    "          validateResponse(",
    "            response as Response,",
    "            input.validation?.response as NoohStandardSchema,",
    `            ${routeLabel}`,
    "          )",
    "        );",
    "      }",
    "",
    "      return validateResponse(",
    "        result as Response,",
    "        input.validation.response,",
    `        ${routeLabel}`,
    "      );",
    "    }",
    "",
    "    return result;",
    "  };",
    "",

    `  endpoint.${route.method}(`,
    '    "/",',
    "    handler as unknown as Handler<",
    "      App,",
    '      "/",',
    "      any,",
    "      HandlerResponse<unknown>",
    "    >",
    "  );",
    "",
    "  return endpoint;",
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
    `import { Hono } from "hono";`,
    "import type {",
    "  Context,",
    "  Handler,",
    "  Input,",
    "  MiddlewareHandler,",
    "  ToSchema,",
    "  TypedResponse",
    '} from "hono";',
    `import type { HandlerResponse } from "hono/types";`,
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
    "  ValidateDependencies",
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
      "  getDependencyResolutionContext",
      "} from " +
        JSON.stringify(relativeModuleSpecifier(moduleId, dependencyModuleId)) +
        ";"
    );
  }

  const prelude: string[] = ["", ...COMMON_TYPES];

  if (mode === "runtime") {
    prelude.push(
      "",
      "const validatorEngine = (",
      "  config.validator?.engine ?? sValidator",
      ") as unknown as (",
      "  target: NoohRequestValidationTarget,",
      "  schema: NoohStandardSchema",
      ") => MiddlewareHandler<App>;",
      "",
      "const createErrorContext = <",
      "  const E extends ErrorDefinitions",
      ">(",
      "  definitions: E | undefined",
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
      "  T extends object",
      ">(",
      "  value: T,",
      "  dependencies: readonly RouteDependency[]",
      "): T => {",
      "  const metadata: NoohRouteMetadata = {",
      '    kind: "route",',
      "    dependencies",
      "  };",
      "",
      "  Object.defineProperty(",
      "    value,",
      "    NOOH_ROUTE_METADATA,",
      "    {",
      "      value: metadata,",
      "      enumerable: false",
      "    }",
      "  );",
      "",
      "  return value;",
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
