export type DependencyScope = "singleton" | "request" | "transient" | "value";

export interface DependencyResolutionContext {
  readonly cache: Map<object, unknown>;
}

export interface DependencyDefinition<
  Value,
  Scope extends DependencyScope = DependencyScope,
> {
  readonly __nooh_definition: true;
  readonly factory: () => Value;
  readonly scope: Scope;
}

export interface DependencyReference<
  Name extends string,
  Value,
  Scope extends DependencyScope = DependencyScope,
> {
  readonly __nooh_dependency: true;
  readonly name: Name;
  readonly resolve: (context: DependencyResolutionContext) => Value;
  readonly scope: Scope;
}

export type AnyDependencyReference = DependencyReference<
  string,
  unknown,
  DependencyScope
>;

export type DependencyEntry =
  | DependencyDefinition<unknown, DependencyScope>
  | (() => unknown);

type DefinitionValue<T> =
  T extends DependencyDefinition<infer Value, DependencyScope>
    ? Value
    : T extends () => infer Value
      ? Value
      : never;

type DefinitionScope<T> =
  T extends DependencyDefinition<unknown, infer Scope>
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

const createDefinition = <Value, Scope extends DependencyScope>(
  scope: Scope,
  factory: () => Value
): DependencyDefinition<Value, Scope> => ({
  __nooh_definition: true,
  factory,
  scope,
});

export const singleton = <Value>(
  factory: () => Value
): DependencyDefinition<Value, "singleton"> =>
  createDefinition("singleton", factory);

export const request = <Value>(
  factory: () => Value
): DependencyDefinition<Value, "request"> =>
  createDefinition("request", factory);

export const transient = <Value>(
  factory: () => Value
): DependencyDefinition<Value, "transient"> =>
  createDefinition("transient", factory);

export const value = <Value>(
  input: Value
): DependencyDefinition<Value, "value"> =>
  createDefinition("value", () => input);

const createReference = <
  Name extends string,
  Value,
  Scope extends DependencyScope,
>(
  name: Name,
  definition: DependencyDefinition<Value, Scope>
): DependencyReference<Name, Value, Scope> => {
  let singletonInitialized = false;
  let singletonValue!: Value;

  let reference!: DependencyReference<Name, Value, Scope>;

  reference = Object.freeze({
    __nooh_dependency: true as const,

    name,

    resolve: (context: DependencyResolutionContext): Value => {
      switch (definition.scope) {
        case "singleton": {
          if (!singletonInitialized) {
            singletonValue = definition.factory();

            singletonInitialized = true;
          }

          return singletonValue;
        }

        case "request": {
          if (context.cache.has(reference)) {
            return context.cache.get(reference) as Value;
          }

          const resolved = definition.factory();

          context.cache.set(reference, resolved);

          return resolved;
        }

        case "transient":
        case "value":
          return definition.factory();

        default: {
          const scope: never = definition.scope;
          throw new Error(`Unsupported dependency scope "${scope}".`);
        }
      }
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
        DefinitionScope<typeof entry>
      >
    );
  }

  return Object.freeze(result) as Container<Entries>;
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
