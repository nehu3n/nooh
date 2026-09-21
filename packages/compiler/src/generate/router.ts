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
  const dependencyNames = getDependencyNames(model, route);

  const common = [
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
  ];

  if (mode === "introspection") {
    return [
      ...common,
      "",
      '  if (typeof input === "function") {',
      "    return defineRouteMetadata(",
      "      [input],",
      "      [],",
      "    );",
      "  }",
      "",
      "  return defineRouteMetadata(",
      `    [input.handler as unknown as ${prefix}RouteHandler],`,
      "    input.deps ?? [],",
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
    "    return [input];",
    "  }",
    "",
    "  const dependencies = input.deps ?? [];",
    "",
    `  const handler: ${prefix}RouteHandler = (c, next) => {`,
    ...(dependencyNames.length > 0
      ? [
          "    const dependencyContext =",
          "      getDependencyResolutionContext(c);",
          "",
          ...dependencyResolution,
          "",
        ]
      : []),

    "    const valid =",
    "      c.req.valid as unknown as",
    "        (target: ValidationTarget) => unknown;",
    "",
    "    const validationInput =",
    "      Object.create(null) as Record<string, unknown>;",
    "",

    ...(
      ["json", "form", "query", "param", "header", "cookie"] as const
    ).flatMap((target) => [
      `    if (input.validation?.${target} !== undefined) {`,
      `      validationInput.${target} = valid(${JSON.stringify(target)});`,
      "    }",
      "",
    ]),
    "    return input.handler({",
    "      c,",
    "      next,",
    "      ...validationInput,",
    ...dependencyProperties,
    "    });",
    "  };",
    "",
    "  return [",
    `    ...((input.middleware ?? []) as readonly ${prefix}RouteHandler[]),`,
    ...(["json", "form", "query", "param", "header", "cookie"] as const).map(
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

const COMMON_TYPES = [
  "type RouteDependency = AnyDependencyReference;",
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
  "type ReservedDependencyName =",
  '  | "c"',
  '  | "next"',
  '  | "error"',
  "  | ValidationTarget;",
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

  const usesDependencies =
    mode === "runtime" &&
    routes.some((route) => {
      const dependencyModel = getRouteDependencyModel(model, route.id);
      return !!dependencyModel?.roots.length;
    });

  const imports: string[] = [
    `import type { Handler, MiddlewareHandler } from "hono";`,
    "import type {",
    "  AnyDependencyReference,",
    "  DependencyContext,",
    "  ValidateDependencies,",
    '} from "@nooh-ts/nooh";',
    `import type { App } from ${JSON.stringify(
      relativeModuleSpecifier(moduleId, typesModuleId)
    )};`,
  ];

  if (mode === "runtime") {
    imports.unshift(`import { sValidator } from "@hono/standard-validator";`);
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
