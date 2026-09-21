import type { CompilationPlan, GeneratedModule, ProjectModel } from "@/types";
import { relativeModuleSpecifier } from "@/utils/path";

export const generateErrorModule = (
  plan: CompilationPlan,
  _model: ProjectModel
): GeneratedModule => {
  const moduleId = `${plan.outputRoot}/error.ts`;
  const typesModuleId = `${plan.outputRoot}/types.ts`;

  const code = [
    `import type { ErrorHandler } from "hono";`,
    `import type { App } from ${JSON.stringify(
      relativeModuleSpecifier(moduleId, typesModuleId)
    )};`,
    "",
    "export const defaultErrorHandler: ErrorHandler<App> = (error, c) => {",
    '  if ("getResponse" in error) {',
    "    const response = error.getResponse();",
    "",
    "    return c.newResponse(response.body, response);",
    "  }",
    "",
    "  console.error(error);",
    "",
    '  return c.json({ error: "Internal Server Error" }, 500);',
    "};",
    "",
  ].join("\n");

  return {
    code,
    id: moduleId,
    kind: "error",
  };
};
