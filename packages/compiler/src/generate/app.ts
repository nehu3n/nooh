import { groupModuleId } from "@/generate/utils";

import type { CompilationPlan, GeneratedModule, ProjectModel } from "@/types";
import { relativeModuleSpecifier } from "@/utils/path";

export const generateAppModule = (
  plan: CompilationPlan,
  model: ProjectModel
): GeneratedModule => {
  const moduleId = `${plan.outputRoot}/app.ts`;
  const typesModuleId = `${plan.outputRoot}/types.ts`;

  const imports = [
    `import { Hono } from "hono";`,
    `import type { App } from ${JSON.stringify(
      relativeModuleSpecifier(moduleId, typesModuleId)
    )};`,
  ];

  model.groups.forEach((group, index) => {
    imports.push(
      `import group${index} from ${JSON.stringify(
        relativeModuleSpecifier(moduleId, groupModuleId(plan, group.id))
      )};`
    );
  });

  const chain = ["const app = new Hono<App>()"];

  model.groups.forEach((group, index) => {
    chain.push(`  .route(${JSON.stringify(group.path)}, group${index})`);
  });

  chain.push(
    ";",
    "",
    "export type AppType = typeof app;",
    "",
    "export default app;",
    ""
  );

  return {
    code: [...imports, "", ...chain].join("\n"),
    id: moduleId,
    kind: "app",
  };
};
