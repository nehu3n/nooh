import type { CompilationPlan, GeneratedModule } from "@/types";

export const generateMiddlewareModule = (
  plan: CompilationPlan
): GeneratedModule => {
  const moduleId = `${plan.outputRoot}/router/middleware.ts`;

  return {
    code: [
      `import { createMiddleware } from "hono/factory";`,
      `import type { App } from "../types.js";`,
      "",
      "export const middleware = createMiddleware<App>;",
      "",
    ].join("\n"),
    id: moduleId,
    kind: "middleware",
  };
};
