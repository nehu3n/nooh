import { normalizePath } from "@/path";
import type { CompilationPlan, ModulePlan, ProjectModel } from "@/types";

const DEFAULT_OUTPUT_ROOT = ".nooh";

const modulePath = (outputRoot: string, value: string): string =>
  normalizePath(`${outputRoot}/${value}.ts`);

export const plan = (
  model: ProjectModel,
  outputRoot: string = DEFAULT_OUTPUT_ROOT
): CompilationPlan => {
  const normalizedOutputRoot = normalizePath(outputRoot);

  const modules: ModulePlan[] = [];

  modules.push({
    id: modulePath(normalizedOutputRoot, "types"),
    kind: "types",
  });

  const routerPaths = [
    ...new Set(model.routes.map((route) => route.routerPath)),
  ].sort();

  for (const routerPath of routerPaths) {
    const route = model.routes.find(
      (candidate) => candidate.routerPath === routerPath
    );

    if (!route) {
      continue;
    }

    modules.push({
      id: modulePath(normalizedOutputRoot, routerPath),
      kind: "router",
      routeId: route.routerPath,
    });
  }

  for (const group of model.groups) {
    const groupPath =
      group.id === "root" ? "groups/root" : `groups/${group.id}`;

    modules.push({
      groupId: group.id,
      id: modulePath(normalizedOutputRoot, groupPath),
      kind: "group",
    });
  }

  modules.push({
    id: modulePath(normalizedOutputRoot, "app"),
    kind: "app",
  });

  modules.sort((a, b) => a.id.localeCompare(b.id));

  return {
    modules,
    outputRoot: normalizedOutputRoot,
  };
};
