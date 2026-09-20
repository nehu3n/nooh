import type {
  DependencyDeclaration,
  DependencyGraph,
  DependencyNode,
  DependencyScope,
  Diagnostic,
} from "@/types";

const scopeRank: Record<DependencyScope, number> = {
  request: 1,
  singleton: 0,
  transient: 2,
  value: 0,
};

const createEmptyGraph = (): DependencyGraph => ({
  nodes: new Map<string, DependencyNode>(),
  order: [],
});

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

export interface DependencyGraphResult {
  readonly diagnostics: readonly Diagnostic[];
  readonly graph: DependencyGraph;
}

export const createDependencyGraph = (
  declarations: readonly DependencyDeclaration[]
): DependencyGraphResult => {
  if (declarations.length === 0) {
    return {
      diagnostics: [],
      graph: createEmptyGraph(),
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
