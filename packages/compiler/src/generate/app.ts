import { groupModuleId } from "@/generate/utils";

import type { CompilationPlan, GeneratedModule, ProjectModel } from "@/types";
import { relativeModuleSpecifier } from "@/utils/path";

export const generateAppModule = (
  plan: CompilationPlan,
  model: ProjectModel
): GeneratedModule => {
  const moduleId = `${plan.outputRoot}/app.ts`;
  const typesModuleId = `${plan.outputRoot}/types.ts`;
  const errorModuleId = `${plan.outputRoot}/error.ts`;

  const root = model.groups.find((group) => group.id === "root");

  if (!root) {
    throw new Error("Nooh compilation requires a root route group.");
  }

  const imports = [
    `import { Hono } from "hono";`,
    `import config from ${JSON.stringify(
      relativeModuleSpecifier(moduleId, model.config.source)
    )};`,
    `import type { App } from ${JSON.stringify(
      relativeModuleSpecifier(moduleId, typesModuleId)
    )};`,
    `import { defaultErrorHandler } from ${JSON.stringify(
      relativeModuleSpecifier(moduleId, errorModuleId)
    )};`,
    `import root from ${JSON.stringify(
      relativeModuleSpecifier(moduleId, groupModuleId(plan, root.id))
    )};`,
  ];

  const code = [
    ...imports,
    "",
    "const app = new Hono<App>();",
    "",
    "if (config.onError !== undefined) {",
    "  app.onError(",
    "    config.onError as Parameters<typeof app.onError>[0],",
    "  );",
    "} else {",
    "  app.onError(defaultErrorHandler);",
    "}",
    "",
    'app.route("/", root);',
    "",
    "export type AppType = typeof app;",
    "",
    "export default app;",
    "",
  ].join("\n");

  return {
    code,
    id: moduleId,
    kind: "app",
  };
};
