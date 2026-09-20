export type DependencyScope = "singleton" | "request" | "transient" | "value";

export interface DependencyResolutionContext {
  readonly cache: Map<object, unknown>;
  readonly resolving: Set<object>;
  readonly stack: string[];
}

export class DependencyCycleError extends Error {
  readonly path: readonly string[];

  constructor(path: readonly string[]) {
    super(`Circular dependency detected: ${path.join(" -> ")}.`);

    this.name = "DependencyCycleError";
    this.path = path;
  }
}

export interface DependencyDefinition<
  Value,
  Scope extends DependencyScope = DependencyScope,
  Dependencies extends readonly AnyDependencyReference[] = readonly [],
> {
  readonly __nooh_definition: true;
  readonly dependencies: Dependencies;
  readonly factory: (dependencies: DependencyContext<Dependencies>) => Value;
  readonly scope: Scope;
}

export interface DependencyReference<
  Name extends string,
  Value,
  Scope extends DependencyScope = DependencyScope,
  Dependencies extends readonly AnyDependencyReference[] = readonly [],
> {
  readonly __nooh_dependency: true;
  readonly dependencies: Dependencies;
  readonly name: Name;
  readonly resolve: (context: DependencyResolutionContext) => Value;
  readonly scope: Scope;
}

export type AnyDependencyReference = DependencyReference<
  string,
  unknown,
  DependencyScope,
  readonly AnyDependencyReference[]
>;

type AnyDependencyDefinition = DependencyDefinition<
  unknown,
  DependencyScope,
  readonly AnyDependencyReference[]
>;

export type DependencyEntry = AnyDependencyDefinition | (() => unknown);

type DefinitionValue<T> =
  T extends DependencyDefinition<
    infer Value,
    DependencyScope,
    readonly AnyDependencyReference[]
  >
    ? Value
    : T extends () => infer Value
      ? Value
      : never;

type DefinitionScope<T> =
  T extends DependencyDefinition<
    unknown,
    infer Scope,
    readonly AnyDependencyReference[]
  >
    ? Scope
    : T extends () => unknown
      ? "singleton"
      : never;

type DefinitionDependencies<T> =
  T extends DependencyDefinition<unknown, DependencyScope, infer Dependencies>
    ? Dependencies
    : T extends () => unknown
      ? readonly []
      : never;

export type Container<Entries extends Record<string, DependencyEntry>> = {
  readonly [Key in keyof Entries & string]: DependencyReference<
    Key,
    DefinitionValue<Entries[Key]>,
    DefinitionScope<Entries[Key]>,
    DefinitionDependencies<Entries[Key]>
  >;
};

interface DependencyFactoryOptions<
  Scope extends DependencyScope,
  Dependencies extends readonly AnyDependencyReference[],
  Value,
> {
  readonly deps: Dependencies & ValidateDependencyScopes<Scope, Dependencies>;
  readonly factory: (dependencies: DependencyContext<Dependencies>) => Value;
}

type CanDependOn<
  Parent extends DependencyScope,
  Child extends DependencyScope,
> = Parent extends "singleton"
  ? Child extends "singleton" | "value"
    ? true
    : false
  : Parent extends "request"
    ? Child extends "singleton" | "request" | "transient" | "value"
      ? true
      : false
    : Parent extends "transient"
      ? true
      : Child extends "value"
        ? true
        : false;

export interface InvalidDependencyScope<
  Parent extends DependencyScope,
  Child extends DependencyScope,
> {
  readonly __nooh_dependency_error__: `A ${Parent} dependency cannot depend on a ${Child} dependency.`;
}

type ValidateDependencyScopesImpl<
  Parent extends DependencyScope,
  Dependencies extends readonly AnyDependencyReference[],
> = Dependencies extends readonly [infer Head, ...infer Tail]
  ? Head extends AnyDependencyReference
    ? Head extends DependencyReference<
        string,
        unknown,
        infer ChildScope,
        readonly AnyDependencyReference[]
      >
      ? CanDependOn<Parent, ChildScope> extends true
        ? readonly [
            Head,
            ...ValidateDependencyScopesImpl<
              Parent,
              Tail extends readonly AnyDependencyReference[] ? Tail : []
            >,
          ]
        : readonly [
            Head & InvalidDependencyScope<Parent, ChildScope>,
            ...ValidateDependencyScopesImpl<
              Parent,
              Tail extends readonly AnyDependencyReference[] ? Tail : []
            >,
          ]
      : Dependencies
    : Dependencies
  : Dependencies;

export type ValidateDependencyScopes<
  Parent extends DependencyScope,
  Dependencies extends readonly AnyDependencyReference[],
> = ValidateDependencyScopesImpl<Parent, Dependencies>;

const createDefinition = <
  Value,
  Scope extends DependencyScope,
  const Dependencies extends readonly AnyDependencyReference[],
>(
  scope: Scope,
  dependencies: Dependencies,
  factory: (dependencies: DependencyContext<Dependencies>) => Value
): DependencyDefinition<Value, Scope, Dependencies> => ({
  __nooh_definition: true,
  dependencies,
  factory,
  scope,
});

export function singleton<Value>(
  factory: () => Value
): DependencyDefinition<Value, "singleton", readonly []>;

export function singleton<
  const Dependencies extends readonly AnyDependencyReference[],
  Value,
>(
  options: DependencyFactoryOptions<"singleton", Dependencies, Value>
): DependencyDefinition<Value, "singleton", Dependencies>;

export function singleton<
  const Dependencies extends readonly AnyDependencyReference[],
  Value,
>(
  input:
    | (() => Value)
    | DependencyFactoryOptions<"singleton", Dependencies, Value>
): DependencyDefinition<Value, "singleton", Dependencies> {
  if (typeof input === "function") {
    return createDefinition("singleton", [], () =>
      input()
    ) as unknown as DependencyDefinition<Value, "singleton", Dependencies>;
  }

  return createDefinition("singleton", input.deps, input.factory);
}

export function request<Value>(
  factory: () => Value
): DependencyDefinition<Value, "request", readonly []>;

export function request<
  const Dependencies extends readonly AnyDependencyReference[],
  Value,
>(
  options: DependencyFactoryOptions<"request", Dependencies, Value>
): DependencyDefinition<Value, "request", Dependencies>;

export function request<
  const Dependencies extends readonly AnyDependencyReference[],
  Value,
>(
  input:
    | (() => Value)
    | DependencyFactoryOptions<"request", Dependencies, Value>
): DependencyDefinition<Value, "request", Dependencies> {
  if (typeof input === "function") {
    return createDefinition("request", [], () =>
      input()
    ) as unknown as DependencyDefinition<Value, "request", Dependencies>;
  }

  return createDefinition("request", input.deps, input.factory);
}

export function transient<Value>(
  factory: () => Value
): DependencyDefinition<Value, "transient", readonly []>;

export function transient<
  const Dependencies extends readonly AnyDependencyReference[],
  Value,
>(
  options: DependencyFactoryOptions<"transient", Dependencies, Value>
): DependencyDefinition<Value, "transient", Dependencies>;

export function transient<
  const Dependencies extends readonly AnyDependencyReference[],
  Value,
>(
  input:
    | (() => Value)
    | DependencyFactoryOptions<"transient", Dependencies, Value>
): DependencyDefinition<Value, "transient", Dependencies> {
  if (typeof input === "function") {
    return createDefinition("transient", [], () =>
      input()
    ) as unknown as DependencyDefinition<Value, "transient", Dependencies>;
  }

  return createDefinition("transient", input.deps, input.factory);
}

export const value = <Value>(
  input: Value
): DependencyDefinition<Value, "value", readonly []> =>
  createDefinition("value", [], () => input);

const resolveDependencies = <
  const Dependencies extends readonly AnyDependencyReference[],
>(
  dependencies: Dependencies,
  context: DependencyResolutionContext
): DependencyContext<Dependencies> => {
  const resolved = Object.create(null) as Record<string, unknown>;

  for (const dependency of dependencies) {
    resolved[dependency.name] = dependency.resolve(context);
  }

  return resolved as DependencyContext<Dependencies>;
};

const resolveReference = <
  Name extends string,
  Value,
  Scope extends DependencyScope,
  const Dependencies extends readonly AnyDependencyReference[],
>(
  reference: DependencyReference<Name, Value, Scope, Dependencies>,
  definition: DependencyDefinition<Value, Scope, Dependencies>,
  context: DependencyResolutionContext
): Value => {
  if (context.resolving.has(reference)) {
    const start = context.stack.indexOf(reference.name);

    const cycle =
      start === -1
        ? [...context.stack, reference.name]
        : [...context.stack.slice(start), reference.name];

    throw new DependencyCycleError(cycle);
  }

  context.resolving.add(reference);
  context.stack.push(reference.name);

  try {
    return definition.factory(
      resolveDependencies(definition.dependencies, context)
    );
  } finally {
    context.stack.pop();
    context.resolving.delete(reference);
  }
};

const createReference = <
  Name extends string,
  Value,
  Scope extends DependencyScope,
  const Dependencies extends readonly AnyDependencyReference[],
>(
  name: Name,
  definition: DependencyDefinition<Value, Scope, Dependencies>
): DependencyReference<Name, Value, Scope, Dependencies> => {
  let singletonInitialized = false;
  let singletonValue!: Value;

  let reference!: DependencyReference<Name, Value, Scope, Dependencies>;

  reference = Object.freeze({
    __nooh_dependency: true as const,

    dependencies: definition.dependencies,

    name,

    resolve: (context: DependencyResolutionContext): Value => {
      if (definition.scope === "singleton") {
        if (!singletonInitialized) {
          singletonValue = resolveReference(reference, definition, context);

          singletonInitialized = true;
        }

        return singletonValue;
      }

      if (definition.scope === "request") {
        if (context.cache.has(reference)) {
          return context.cache.get(reference) as Value;
        }

        const resolved = resolveReference(reference, definition, context);

        context.cache.set(reference, resolved);

        return resolved;
      }

      return resolveReference(reference, definition, context);
    },

    scope: definition.scope,
  });

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
        DefinitionValue<typeof entry>,
        DefinitionScope<typeof entry>,
        DefinitionDependencies<typeof entry>
      >
    );
  }

  return Object.freeze(result) as Container<Entries>;
};

export type DependencyName<Dependency> =
  Dependency extends DependencyReference<
    infer Name,
    unknown,
    DependencyScope,
    readonly AnyDependencyReference[]
  >
    ? Name
    : never;

export type DependencyValue<Dependency> =
  Dependency extends DependencyReference<
    string,
    infer Value,
    DependencyScope,
    readonly AnyDependencyReference[]
  >
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

export interface ReservedDependencyName<Name extends string> {
  readonly __nooh_dependency_error__: `Dependency name "${Name}" is reserved by the handler context.`;
}

type ValidateDependenciesImpl<
  Dependencies extends readonly AnyDependencyReference[],
  Reserved extends string,
  Seen extends string = never,
> = Dependencies extends readonly [infer Head, ...infer Tail]
  ? Head extends AnyDependencyReference
    ? DependencyName<Head> extends infer Name
      ? Name extends string
        ? Name extends Reserved
          ? readonly [
              Head & ReservedDependencyName<Name>,
              ...ValidateDependenciesImpl<
                Tail extends readonly AnyDependencyReference[] ? Tail : [],
                Reserved,
                Seen
              >,
            ]
          : Name extends Seen
            ? readonly [
                Head & DuplicateDependency<Name>,
                ...ValidateDependenciesImpl<
                  Tail extends readonly AnyDependencyReference[] ? Tail : [],
                  Reserved,
                  Seen
                >,
              ]
            : readonly [
                Head,
                ...ValidateDependenciesImpl<
                  Tail extends readonly AnyDependencyReference[] ? Tail : [],
                  Reserved,
                  Seen | Name
                >,
              ]
        : Dependencies
      : Dependencies
    : Dependencies
  : Dependencies;

export type ValidateDependencies<
  Dependencies extends readonly AnyDependencyReference[],
  Reserved extends string = never,
> = ValidateDependenciesImpl<Dependencies, Reserved>;
