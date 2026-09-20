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

export type RouterGenerationMode = "runtime" | "introspection";

const getRoutesForRouter = (
  model: ProjectModel,
  routerPath: string
): readonly RouteModel[] =>
  model.routes
    .filter((route) => route.routerPath === routerPath)
    .sort((a, b) => a.method.localeCompare(b.method));

const renderMethod = (
  route: RouteModel,
  mode: RouterGenerationMode
): string => {
  const functionName = METHOD_FUNCTION_NAMES[route.method];

  const prefix = functionName.charAt(0).toUpperCase() + functionName.slice(1);

  const path = JSON.stringify(ensureLeadingSlash(route.localPath));

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
    "type RouteDependency = AnyDependencyReference;",
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
    "};",
    "",
    // ... resto de los tipos actuales ...
  ];

  if (mode === "introspection") {
    return [
      ...common,
      "",
      '  if (typeof input === "function") {',
      "    return defineRouteMetadata([input], []);",
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

  return [
    ...common,
    "",
    '  if (typeof input === "function") {',
    "    return defineRouteMetadata([input], []);",
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
    "",
    "    return input.handler({",
    "      c,",
    "      next,",
    "      ...validationInput,",
    "      ...resolvedDependencies,",
    "    });",
    "  };",
    "",
    "  return defineRouteMetadata(",
    "    [",
    "      ...((input.middleware ?? []) as readonly",
    `        ${prefix}RouteHandler[]),`,
    ...VALIDATION_TARGETS.map(
      (target) =>
        `      ...(input.validation?.${target} !== undefined ? [sValidator(${JSON.stringify(
          target
        )}, input.validation.${target}) as ${prefix}RouteHandler] : []),`
    ),
    "      handler,",
    "    ],",
    "    dependencies,",
    "  );",
    "}",
    "",
  ].join("\n");
};

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

  const imports = [
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

    imports.push(
      "import {",
      "  createDependencyResolutionContext,",
      "  resolveDependencies,",
      `} from ${JSON.stringify(
        relativeModuleSpecifier(moduleId, dependencyModuleId)
      )};`
    );
  }

  const prelude =
    mode === "introspection"
      ? [
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
          "};",
        ]
      : [];

  const code = [
    ...imports,
    "",
    "type RouteDependency = AnyDependencyReference;",
    "",
    "type ReservedDependencyName =",
    '  | "c"',
    '  | "next"',
    '  | "error"',
    "  | ValidationTarget;",
    ...prelude,
    "",
    ...routes.map((route) => renderMethod(route, mode)),
  ].join("\n");

  return {
    code,
    id: moduleId,
    kind: "router",
  };
};
