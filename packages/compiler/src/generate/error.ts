import type { CompilationPlan, GeneratedModule } from "@/types";
import { relativeModuleSpecifier } from "@/utils/path";

export const generateErrorModule = (plan: CompilationPlan): GeneratedModule => {
  const moduleId = `${plan.outputRoot}/error.ts`;
  const typesModuleId = `${plan.outputRoot}/types.ts`;

  const code = [
    `import { HTTPException } from "hono/http-exception";`,
    `import type { ErrorHandler } from "hono";`,
    `import type { App } from ${JSON.stringify(
      relativeModuleSpecifier(moduleId, typesModuleId)
    )};`,
    "",
    "export const defaultErrorHandler: ErrorHandler<App> = (error, c) => {",
    "",
    "  if (error instanceof HTTPException) {",
    "    return error.getResponse();",
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
