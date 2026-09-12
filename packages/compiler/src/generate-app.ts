import { relativeModuleSpecifier } from "@/path";
import type { CompilationPlan, GeneratedModule, ProjectModel } from "@/types";

const groupModuleId = (plan: CompilationPlan, groupId: string): string => {
  if (groupId === "root") {
    return `${plan.outputRoot}/groups/root.ts`;
  }

  return `${plan.outputRoot}/groups/${groupId}.ts`;
};

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

  for (const [index, group] of model.groups.entries()) {
    imports.push(
      `import group${index} from ${JSON.stringify(
        relativeModuleSpecifier(moduleId, groupModuleId(plan, group.id))
      )};`
    );
  }

  const chain = ["", "const app = new Hono<App>()"];

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
    code: [...imports, ...chain].join("\n"),
    id: moduleId,
    kind: "app",
  };
};
