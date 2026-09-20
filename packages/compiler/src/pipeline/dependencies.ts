import type {
  DependencyDeclaration,
  DependencyGraph,
  DependencyNode,
  DependencyScope,
  Diagnostic,
  ModuleLoader,
  SourceFile,
} from "@/types";

interface DependencyReferenceLike {
  readonly __nooh_dependency: true;
  readonly dependencies: readonly unknown[];
  readonly name: string;
  readonly scope: DependencyScope;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isDependencyReference = (
  value: unknown
): value is DependencyReferenceLike =>
  isRecord(value) &&
  value.__nooh_dependency === true &&
  typeof value.name === "string" &&
  Array.isArray(value.dependencies) &&
  (value.scope === "value" ||
    value.scope === "singleton" ||
    value.scope === "request" ||
    value.scope === "transient");

const isDependencyContainer = (
  value: unknown
): value is Record<string, unknown> => {
  if (!isRecord(value) || Array.isArray(value)) {
    return false;
  }

  if (!Object.isFrozen(value)) {
    return false;
  }

  const entries = Object.entries(value);

  return (
    entries.length > 0 &&
    entries.every(([, entry]) => isDependencyReference(entry))
  );
};

const emptyGraph = (): DependencyGraph => ({
  nodes: new Map(),
  order: [],
  references: new Map(),
});

const canDependOn = (
  parent: DependencyScope,
  child: DependencyScope
): boolean => {
  if (parent === "singleton") {
    return child === "singleton" || child === "value";
  }

  if (parent === "request") {
    return (
      child === "singleton" ||
      child === "request" ||
      child === "transient" ||
      child === "value"
    );
  }

  if (parent === "transient") {
    return true;
  }

  return child === "value";
};

const createScopeDiagnostic = (
  declaration: DependencyDeclaration,
  dependency: DependencyDeclaration
): Diagnostic | null => {
  if (canDependOn(declaration.scope, dependency.scope)) {
    return null;
  }

  return {
    code: "NOOH020",
    file: declaration.source,
    message: [
      `Dependency "${declaration.name}" with scope "${declaration.scope}"`,
      `cannot depend on "${dependency.name}" with scope "${dependency.scope}".`,
    ].join(" "),
    severity: "error",
  };
};

const createMissingDependencyDiagnostic = (
  declaration: DependencyDeclaration,
  dependencyId: string
): Diagnostic => ({
  code: "NOOH021",
  file: declaration.source,
  message: [
    `Dependency "${declaration.name}" references`,
    `unknown dependency "${dependencyId}".`,
  ].join(" "),
  severity: "error",
});

const createDuplicateDependencyDiagnostic = (
  declaration: DependencyDeclaration
): Diagnostic => ({
  code: "NOOH022",
  file: declaration.source,
  message: `Duplicate dependency provider "${declaration.id}".`,
  severity: "error",
});

const createCycleDiagnostic = (
  cycle: readonly DependencyNode[]
): Diagnostic => {
  const [first] = cycle;

  return {
    code: "NOOH023",
    ...(first?.declaration.source !== undefined && {
      file: first.declaration.source,
    }),
    message: `Circular dependency detected: ${cycle
      .map((node) => node.declaration.name)
      .join(" -> ")}`,
    severity: "error",
  };
};

const topologicalOrder = (
  nodes: ReadonlyMap<string, DependencyNode>,
  diagnostics: Diagnostic[]
): readonly string[] => {
  const state = new Map<string, "unvisited" | "visiting" | "visited">();
  const stack: string[] = [];
  const order: string[] = [];

  const visit = (id: string): void => {
    const current = state.get(id);

    if (current === "visited") {
      return;
    }

    if (current === "visiting") {
      const cycleStart = stack.indexOf(id);

      const cycleIds =
        cycleStart === -1 ? [...stack, id] : [...stack.slice(cycleStart), id];

      const cycle = cycleIds
        .map((cycleId) => nodes.get(cycleId))
        .filter((n): n is DependencyNode => n !== undefined);

      diagnostics.push(createCycleDiagnostic(cycle));

      return;
    }

    const node = nodes.get(id);

    if (!node) {
      return;
    }

    state.set(id, "visiting");
    stack.push(id);

    for (const dependencyId of node.declaration.dependencies) {
      visit(dependencyId);
    }

    stack.pop();
    state.set(id, "visited");

    order.push(id);
  };

  const ids = [...nodes.keys()].sort();

  for (const id of ids) {
    visit(id);
  }

  return order;
};

export const createDependencyGraph = (
  declarations: readonly DependencyDeclaration[],
  references: ReadonlyMap<object, string> = new Map()
): {
  readonly diagnostics: readonly Diagnostic[];
  readonly graph: DependencyGraph;
} => {
  if (declarations.length === 0) {
    return {
      diagnostics: [],
      graph: {
        ...emptyGraph(),
        references,
      },
    };
  }

  const diagnostics: Diagnostic[] = [];
  const nodes = new Map<string, DependencyNode>();

  for (const declaration of declarations) {
    if (nodes.has(declaration.id)) {
      diagnostics.push(createDuplicateDependencyDiagnostic(declaration));

      continue;
    }

    nodes.set(declaration.id, {
      declaration,
    });
  }

  for (const declaration of declarations) {
    const node = nodes.get(declaration.id);

    if (!node) {
      continue;
    }

    for (const dependencyId of declaration.dependencies) {
      const dependencyNode = nodes.get(dependencyId);

      if (!dependencyNode) {
        diagnostics.push(
          createMissingDependencyDiagnostic(declaration, dependencyId)
        );

        continue;
      }

      const scopeDiagnostic = createScopeDiagnostic(
        declaration,
        dependencyNode.declaration
      );

      if (scopeDiagnostic) {
        diagnostics.push(scopeDiagnostic);
      }
    }
  }

  const order = topologicalOrder(nodes, diagnostics);

  const unique = new Map<string, Diagnostic>();

  for (const diagnostic of diagnostics) {
    const key = [
      diagnostic.code,
      diagnostic.file ?? "",
      diagnostic.message,
    ].join("\0");

    unique.set(key, diagnostic);
  }

  return {
    diagnostics: [...unique.values()],
    graph: {
      nodes,
      order,
      references,
    },
  };
};

const loadModule = async (
  loader: ModuleLoader,
  path: string
): Promise<Record<string, unknown>> => {
  if (loader.loadModule) {
    return loader.loadModule(path);
  }

  const value = await loader.loadDefault(path);

  return {
    default: value,
  };
};

interface LoadedReference {
  readonly id: string;
  readonly name: string;
  readonly reference: DependencyReferenceLike;
  readonly scope: DependencyScope;
  readonly source: string;
}

const collectReferences = (
  source: string,
  module: Record<string, unknown>
): {
  readonly diagnostics: readonly Diagnostic[];
  readonly references: readonly LoadedReference[];
} => {
  const diagnostics: Diagnostic[] = [];
  const references: LoadedReference[] = [];

  const seenObjects = new Set<object>();

  const addReference = (id: string, value: DependencyReferenceLike): void => {
    if (seenObjects.has(value)) {
      diagnostics.push({
        code: "NOOH027",
        file: source,
        message: [
          `Dependency reference "${value.name}"`,
          "is exported more than once.",
          `Duplicate provider: "${id}".`,
        ].join(" "),
        severity: "error",
      });

      return;
    }

    seenObjects.add(value);

    references.push({
      id,
      name: value.name,
      reference: value,
      scope: value.scope,
      source,
    });
  };

  for (const [exportName, exported] of Object.entries(module)) {
    if (exportName === "__esModule") {
      continue;
    }

    if (isDependencyReference(exported)) {
      addReference(`${source}#${exportName}`, exported);

      continue;
    }

    if (isDependencyContainer(exported)) {
      for (const [name, reference] of Object.entries(exported)) {
        if (!isDependencyReference(reference)) {
          continue;
        }

        addReference(`${source}#${exportName}.${name}`, reference);
      }
    }
  }

  return {
    diagnostics,
    references,
  };
};

export const loadDependencyGraph = async (
  sources: readonly SourceFile[],
  loader: ModuleLoader
): Promise<{
  readonly diagnostics: readonly Diagnostic[];
  readonly graph: DependencyGraph;
}> => {
  if (sources.length === 0) {
    return {
      diagnostics: [],
      graph: emptyGraph(),
    };
  }

  const diagnostics: Diagnostic[] = [];
  const loaded: LoadedReference[] = [];

  for (const source of sources) {
    let module: Record<string, unknown> | undefined;

    try {
      // biome-ignore lint/performance/noAwaitInLoops: ...
      module = await loadModule(loader, source.path);
    } catch (error) {
      diagnostics.push({
        code: "NOOH024",
        file: source.path,
        message:
          error instanceof Error
            ? ["Failed to load dependency module:", error.message].join(" ")
            : "Failed to load dependency module.",
        severity: "error",
      });

      continue;
    }

    const result = collectReferences(source.path, module);

    diagnostics.push(...result.diagnostics);

    loaded.push(...result.references);
  }

  const references = new Map<object, string>();

  for (const entry of loaded) {
    references.set(entry.reference, entry.id);
  }

  const declarations: DependencyDeclaration[] = [];

  for (const entry of loaded) {
    const dependencies: string[] = [];

    for (const dependency of entry.reference.dependencies) {
      if (!isDependencyReference(dependency)) {
        diagnostics.push({
          code: "NOOH026",
          file: entry.source,
          message: [
            `Dependency "${entry.name}" contains`,
            "an invalid dependency reference.",
          ].join(" "),
          severity: "error",
        });

        continue;
      }

      const dependencyId = references.get(dependency);

      if (!dependencyId) {
        diagnostics.push({
          code: "NOOH021",
          file: entry.source,
          message: [
            `Dependency "${entry.name}" references`,
            `an unknown dependency "${dependency.name}".`,
          ].join(" "),
          severity: "error",
        });

        continue;
      }

      dependencies.push(dependencyId);
    }

    declarations.push({
      dependencies,
      id: entry.id,
      name: entry.name,
      scope: entry.scope,
      source: entry.source,
    });
  }

  const result = createDependencyGraph(declarations, references);

  return {
    diagnostics: [...diagnostics, ...result.diagnostics],
    graph: result.graph,
  };
};

export const dependencyClosure = (
  graph: DependencyGraph,
  roots: readonly string[]
): readonly string[] => {
  const visited = new Set<string>();
  const result: string[] = [];

  const visit = (id: string): void => {
    if (visited.has(id)) {
      return;
    }

    visited.add(id);

    const node = graph.nodes.get(id);

    if (!node) {
      return;
    }

    for (const dependencyId of node.declaration.dependencies) {
      visit(dependencyId);
    }

    result.push(id);
  };

  for (const root of roots) {
    visit(root);
  }

  return result;
};
