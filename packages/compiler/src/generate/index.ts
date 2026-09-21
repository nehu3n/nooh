import { generateAppModule } from "@/generate/app";
import { generateDependencyModule } from "@/generate/dependency";
import { generateErrorModule } from "@/generate/error";
import { generateGroupModule } from "@/generate/group";
import { generateMiddlewareModule } from "@/generate/middleware";
import { generateRouterModule } from "@/generate/router";
import { generateTypesModule } from "@/generate/types";

import type {
  CompilationPlan,
  GeneratedModule,
  GeneratedOutput,
  ProjectModel,
} from "@/types";

const getRouterPaths = (model: ProjectModel): readonly string[] =>
  [...new Set(model.routes.map((route) => route.routerPath))].sort();

export const generate = (
  plan: CompilationPlan,
  model: ProjectModel
): GeneratedOutput => {
  const modules: GeneratedModule[] = [];

  modules.push(generateTypesModule(plan, model.config));

  modules.push(generateDependencyModule(plan));

  modules.push(generateErrorModule(plan, model));

  modules.push(generateMiddlewareModule(plan));

  for (const routerPath of getRouterPaths(model)) {
    modules.push(generateRouterModule(plan, model, routerPath));
  }

  for (const group of model.groups) {
    modules.push(generateGroupModule(plan, model, group));
  }

  modules.push(generateAppModule(plan, model));

  modules.sort((a, b) => a.id.localeCompare(b.id));

  return {
    modules,
  };
};

export const generateRouteIntrospection = (
  plan: CompilationPlan,
  model: ProjectModel
): GeneratedOutput => {
  const modules: GeneratedModule[] = [];

  for (const routerPath of getRouterPaths(model)) {
    modules.push(
      generateRouterModule(plan, model, routerPath, "introspection")
    );
  }

  modules.sort((a, b) => a.id.localeCompare(b.id));

  return {
    modules,
  };
};
