export type DependencyScope = "singleton" | "request" | "transient" | "value";

export interface DependencyResolutionContext {
  readonly cache: Map<object, unknown>;
  readonly resolving: Set<object>;
  readonly stack: DependencyReference<string, unknown, DependencyScope>[];
}

export type AnyDependencyReference = DependencyReference<
  string,
  unknown,
  DependencyScope
>;

export interface DependencyReference<
  Name extends string,
  Value,
  Scope extends DependencyScope = DependencyScope,
> {
  readonly __nooh_dependency: true;
  readonly dependencies: readonly AnyDependencyReference[];
  readonly name: Name;
  readonly resolve: (context: DependencyResolutionContext) => Value;
  readonly scope: Scope;
}

export interface DependencyDefinition<
  Dependencies extends readonly AnyDependencyReference[],
  Value,
  Scope extends DependencyScope = DependencyScope,
> {
  readonly __nooh_definition: true;
  readonly deps: Dependencies;
  readonly factory: (dependencies: DependencyContext<Dependencies>) => Value;
  readonly scope: Scope;
}

export interface DependencyDefinitionOptions<
  Dependencies extends readonly AnyDependencyReference[],
  Value,
> {
  readonly create: (dependencies: DependencyContext<Dependencies>) => Value;
  readonly deps: Dependencies & ValidateDependencies<Dependencies>;
}

export type DependencyEntry =
  | DependencyDefinition<
      readonly AnyDependencyReference[],
      unknown,
      DependencyScope
    >
  | (() => unknown);

type DefinitionValue<T> =
  T extends DependencyDefinition<
    readonly AnyDependencyReference[],
    infer Value,
    DependencyScope
  >
    ? Value
    : T extends () => infer Value
      ? Value
      : never;

type DefinitionScope<T> =
  T extends DependencyDefinition<
    readonly AnyDependencyReference[],
    unknown,
    infer Scope
  >
    ? Scope
    : T extends () => unknown
      ? "singleton"
      : never;

export type Container<Entries extends Record<string, DependencyEntry>> = {
  readonly [Key in keyof Entries & string]: DependencyReference<
    Key,
    DefinitionValue<Entries[Key]>,
    DefinitionScope<Entries[Key]>
  >;
};

export type DependencyName<Dependency> =
  Dependency extends DependencyReference<infer Name, unknown, DependencyScope>
    ? Name
    : never;

export type DependencyValue<Dependency> =
  Dependency extends DependencyReference<string, infer Value, DependencyScope>
    ? Value
    : never;

export type DependencyContext<
  Dependencies extends readonly AnyDependencyReference[],
> = {
  [Dependency in Dependencies[number] as DependencyName<Dependency>]: DependencyValue<Dependency>;
};

export interface DuplicateDependency<Name extends string> {
  readonly __nooh_dependency_error__: `Duplicate dependency name "${Name}".`;
}

type ValidateDependenciesImpl<
  Dependencies extends readonly AnyDependencyReference[],
  Seen extends string = never,
> = Dependencies extends readonly [infer Head, ...infer Tail]
  ? Head extends AnyDependencyReference
    ? DependencyName<Head> extends infer Name
      ? Name extends string
        ? Name extends Seen
          ? readonly [
              Head & DuplicateDependency<Name>,
              ...ValidateDependenciesImpl<
                Tail extends readonly AnyDependencyReference[] ? Tail : [],
                Seen
              >,
            ]
          : readonly [
              Head,
              ...ValidateDependenciesImpl<
                Tail extends readonly AnyDependencyReference[] ? Tail : [],
                Seen | Name
              >,
            ]
        : Dependencies
      : Dependencies
    : Dependencies
  : Dependencies;

export type ValidateDependencies<
  Dependencies extends readonly AnyDependencyReference[],
> = ValidateDependenciesImpl<Dependencies>;

const scopeRank: Record<DependencyScope, number> = {
  request: 1,
  singleton: 0,
  transient: 2,
  value: 0,
};

const assertScopeCompatibility = (
  ownerScope: DependencyScope,
  dependency: AnyDependencyReference
): void => {
  if (
    ownerScope === "singleton" &&
    scopeRank[dependency.scope] > scopeRank[ownerScope]
  ) {
    throw new Error(
      [
        `Singleton dependency "${dependency.name}" cannot depend on`,
        `${dependency.scope}-scoped dependency "${dependency.name}".`,
      ].join(" ")
    );
  }
};

const assertDependencyGraph = (root: AnyDependencyReference): void => {
  const visiting = new Set<object>();
  const visited = new Set<object>();
  const path: AnyDependencyReference[] = [];

  const visit = (dependency: AnyDependencyReference): void => {
    if (visited.has(dependency)) {
      return;
    }

    if (visiting.has(dependency)) {
      const index = path.indexOf(dependency);

      const cycle =
        index === -1
          ? [...path, dependency]
          : [...path.slice(index), dependency];

      throw new Error(
        `Circular dependency detected: ${cycle
          .map((item) => item.name)
          .join(" -> ")}`
      );
    }

    visiting.add(dependency);
    path.push(dependency);

    for (const child of dependency.dependencies) {
      visit(child);
    }

    path.pop();
    visiting.delete(dependency);
    visited.add(dependency);
  };

  visit(root);
};

const resolveDependencyContext = (
  dependencies: readonly AnyDependencyReference[],
  context: DependencyResolutionContext
): Record<string, unknown> => {
  const resolved = Object.create(null) as Record<string, unknown>;

  for (const dependency of dependencies) {
    resolved[dependency.name] = dependency.resolve(context);
  }

  return resolved;
};

const createDefinition = <
  const Dependencies extends readonly AnyDependencyReference[],
  Value,
  const Scope extends DependencyScope,
>(
  scope: Scope,
  deps: Dependencies,
  factory: (dependencies: DependencyContext<Dependencies>) => Value
): DependencyDefinition<Dependencies, Value, Scope> => {
  if (scope === "value" && deps.length > 0) {
    throw new Error('A "value" dependency cannot declare dependencies.');
  }

  for (const dependency of deps) {
    assertScopeCompatibility(scope, dependency);
  }

  return {
    __nooh_definition: true,
    deps,
    factory,
    scope,
  };
};

export function singleton<Value>(
  factory: () => Value
): DependencyDefinition<readonly [], Value, "singleton">;

export function singleton<
  const Dependencies extends readonly AnyDependencyReference[],
  Value,
>(
  options: DependencyDefinitionOptions<Dependencies, Value>
): DependencyDefinition<Dependencies, Value, "singleton">;

export function singleton<
  const Dependencies extends readonly AnyDependencyReference[],
  Value,
>(
  input: (() => Value) | DependencyDefinitionOptions<Dependencies, Value>
): DependencyDefinition<Dependencies, Value, "singleton"> {
  if (typeof input === "function") {
    return createDefinition("singleton", [], () =>
      input()
    ) as unknown as DependencyDefinition<Dependencies, Value, "singleton">;
  }

  return createDefinition("singleton", input.deps, input.create);
}

export function request<Value>(
  factory: () => Value
): DependencyDefinition<readonly [], Value, "request">;

export function request<
  const Dependencies extends readonly AnyDependencyReference[],
  Value,
>(
  options: DependencyDefinitionOptions<Dependencies, Value>
): DependencyDefinition<Dependencies, Value, "request">;

export function request<
  const Dependencies extends readonly AnyDependencyReference[],
  Value,
>(
  input: (() => Value) | DependencyDefinitionOptions<Dependencies, Value>
): DependencyDefinition<Dependencies, Value, "request"> {
  if (typeof input === "function") {
    return createDefinition("request", [], () =>
      input()
    ) as unknown as DependencyDefinition<Dependencies, Value, "request">;
  }

  return createDefinition("request", input.deps, input.create);
}

export function transient<Value>(
  factory: () => Value
): DependencyDefinition<readonly [], Value, "transient">;

export function transient<
  const Dependencies extends readonly AnyDependencyReference[],
  Value,
>(
  options: DependencyDefinitionOptions<Dependencies, Value>
): DependencyDefinition<Dependencies, Value, "transient">;

export function transient<
  const Dependencies extends readonly AnyDependencyReference[],
  Value,
>(
  input: (() => Value) | DependencyDefinitionOptions<Dependencies, Value>
): DependencyDefinition<Dependencies, Value, "transient"> {
  if (typeof input === "function") {
    return createDefinition("transient", [], () =>
      input()
    ) as unknown as DependencyDefinition<Dependencies, Value, "transient">;
  }

  return createDefinition("transient", input.deps, input.create);
}

export const value = <Value>(
  input: Value
): DependencyDefinition<readonly [], Value, "value"> =>
  createDefinition("value", [], () => input);

const createReference = <
  Name extends string,
  Dependencies extends readonly AnyDependencyReference[],
  Value,
  Scope extends DependencyScope,
>(
  name: Name,
  definition: DependencyDefinition<Dependencies, Value, Scope>
): DependencyReference<Name, Value, Scope> => {
  let singletonInitialized = false;
  let singletonValue!: Value;

  let reference!: DependencyReference<Name, Value, Scope>;

  reference = Object.freeze({
    __nooh_dependency: true as const,

    dependencies: definition.deps,

    name,

    resolve: (context: DependencyResolutionContext): Value => {
      if (definition.scope === "singleton" && singletonInitialized) {
        return singletonValue;
      }

      if (definition.scope === "request" && context.cache.has(reference)) {
        return context.cache.get(reference) as Value;
      }

      if (context.resolving.has(reference)) {
        const index = context.stack.indexOf(reference);

        const cycle =
          index === -1
            ? [...context.stack, reference]
            : [...context.stack.slice(index), reference];

        throw new Error(
          `Circular dependency detected: ${cycle
            .map((item) => item.name)
            .join(" -> ")}`
        );
      }

      context.resolving.add(reference);
      context.stack.push(reference);

      try {
        const dependencies = resolveDependencyContext(definition.deps, context);

        const resolved = definition.factory(
          dependencies as DependencyContext<Dependencies>
        );

        if (definition.scope === "singleton") {
          singletonValue = resolved;
          singletonInitialized = true;
        } else if (definition.scope === "request") {
          context.cache.set(reference, resolved);
        }

        return resolved;
      } finally {
        context.stack.pop();
        context.resolving.delete(reference);
      }
    },

    scope: definition.scope,
  });

  assertDependencyGraph(reference);

  return reference;
};

export const container = <
  const Entries extends Record<string, DependencyEntry>,
>(
  entries: Entries
): Container<Entries> => {
  const result: Record<string, unknown> = Object.create(null);

  const keys = Object.keys(entries) as Array<keyof Entries & string>;

  for (const name of keys) {
    const entry = entries[name];

    const definition = typeof entry === "function" ? singleton(entry) : entry;

    result[name] = createReference(
      name,
      definition as DependencyDefinition<
        readonly AnyDependencyReference[],
        DefinitionValue<typeof entry>,
        DefinitionScope<typeof entry>
      >
    );
  }

  return Object.freeze(result) as Container<Entries>;
};

export const createDependencyResolutionContext =
  (): DependencyResolutionContext => ({
    cache: new Map<object, unknown>(),
    resolving: new Set<object>(),
    stack: [],
  });

export const resolveDependencies = (
  dependencies: readonly AnyDependencyReference[],
  context: DependencyResolutionContext
): Record<string, unknown> => resolveDependencyContext(dependencies, context);
