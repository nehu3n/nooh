import type {
  DependencyDeclaration,
  DependencyGraph,
  DependencyNode,
  DependencyScope,
  Diagnostic,
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

const emptyGraph = (): DependencyGraph => ({
  nodes: new Map<string, DependencyNode>(),
  order: [],
});

const scopeRank: Record<DependencyScope, number> = {
  request: 1,
  singleton: 0,
  transient: 2,
  value: 0,
};

const createScopeDiagnostic = (
  declaration: DependencyDeclaration,
  dependency: DependencyDeclaration
): Diagnostic | null => {
  if (
    declaration.scope === "singleton" &&
    scopeRank[dependency.scope] > scopeRank[declaration.scope]
  ) {
    return {
      code: "NOOH020",
      file: declaration.source,
      message: [
        `Singleton dependency "${declaration.name}" cannot depend on`,
        `${dependency.scope}-scoped dependency "${dependency.name}".`,
      ].join(" "),
      severity: "error",
    };
  }

  return null;
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
  declarations: readonly DependencyDeclaration[]
): {
  readonly diagnostics: readonly Diagnostic[];
  readonly graph: DependencyGraph;
} => {
  if (declarations.length === 0) {
    return {
      diagnostics: [],
      graph: emptyGraph(),
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

  const uniqueDiagnostics = new Map<string, Diagnostic>();

  for (const diagnostic of diagnostics) {
    const key = [
      diagnostic.code,
      diagnostic.file ?? "",
      diagnostic.message,
    ].join("\0");

    uniqueDiagnostics.set(key, diagnostic);
  }

  return {
    diagnostics: [...uniqueDiagnostics.values()],
    graph: {
      nodes,
      order,
    },
  };
};

export const loadDependencyGraph = async (
  sources: readonly SourceFile[],
  loader: {
    readonly loadDefault: (modulePath: string) => Promise<unknown>;
  }
): Promise<{
  readonly diagnostics: readonly Diagnostic[];
  readonly graph: DependencyGraph;
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: ...
}> => {
  if (sources.length === 0) {
    return {
      diagnostics: [],
      graph: emptyGraph(),
    };
  }

  const loaded: Array<{
    readonly source: SourceFile;
    readonly container: Record<string, unknown>;
  }> = [];

  const diagnostics: Diagnostic[] = [];

  for (const source of sources) {
    let exported: unknown;

    try {
      // biome-ignore lint/performance/noAwaitInLoops: ...
      exported = await loader.loadDefault(source.path);
    } catch (error) {
      diagnostics.push({
        code: "NOOH024",
        file: source.path,
        message:
          error instanceof Error
            ? ["Failed to load dependency container:", error.message].join(" ")
            : "Failed to load dependency container.",
        severity: "error",
      });

      continue;
    }

    if (!isRecord(exported) || Array.isArray(exported)) {
      diagnostics.push({
        code: "NOOH025",
        file: source.path,
        message: "A dependency module must default-export a container.",
        severity: "error",
      });

      continue;
    }

    const entries = Object.entries(exported);

    const invalidEntry = entries.find(
      ([, value]) => !isDependencyReference(value)
    );

    if (invalidEntry) {
      diagnostics.push({
        code: "NOOH025",
        file: source.path,
        message: [
          "A dependency container may only expose",
          "dependency references.",
          `Invalid export "${invalidEntry[0]}".`,
        ].join(" "),
        severity: "error",
      });

      continue;
    }

    loaded.push({
      container: exported as Record<string, unknown>,
      source,
    });
  }

  const ids = new Map<DependencyReferenceLike, string>();

  for (const entry of loaded) {
    for (const [key, value] of Object.entries(entry.container)) {
      if (!isDependencyReference(value)) {
        continue;
      }

      const id = `${entry.source.path}#${key}`;

      ids.set(value, id);
    }
  }

  const declarations: DependencyDeclaration[] = [];

  for (const entry of loaded) {
    for (const [key, value] of Object.entries(entry.container)) {
      if (!isDependencyReference(value)) {
        continue;
      }

      const id = `${entry.source.path}#${key}`;
      const dependencies: string[] = [];

      for (const dependency of value.dependencies) {
        if (!isDependencyReference(dependency)) {
          diagnostics.push({
            code: "NOOH026",
            file: entry.source.path,
            message: [
              `Dependency "${value.name}" contains`,
              "an invalid dependency reference.",
            ].join(" "),
            severity: "error",
          });

          continue;
        }

        const dependencyId = ids.get(dependency);

        if (!dependencyId) {
          dependencies.push(`${dependency.name}`);

          continue;
        }

        dependencies.push(dependencyId);
      }

      declarations.push({
        dependencies,
        id,
        name: value.name,
        scope: value.scope,
        source: entry.source.path,
      });
    }
  }

  const graphResult = createDependencyGraph(declarations);

  return {
    diagnostics: [...diagnostics, ...graphResult.diagnostics],
    graph: graphResult.graph,
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
