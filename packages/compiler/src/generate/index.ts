import { generateAppModule } from "@/generate/app";
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

export const generate = (
  plan: CompilationPlan,
  model: ProjectModel
): GeneratedOutput => {
  const modules: GeneratedModule[] = [];

  modules.push(generateTypesModule(plan, model.config));

  modules.push(generateMiddlewareModule(plan));

  const routerPaths = [
    ...new Set(model.routes.map((route) => route.routerPath)),
  ].sort();

  for (const routerPath of routerPaths) {
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
