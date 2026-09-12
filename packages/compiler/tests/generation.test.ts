import { describe, expect, test } from "vitest";

import { generate } from "@/generate";
import { plan } from "@/pipeline/plan";

const model = {
  config: {
    routesRoot: "src/routes",
    source: "src/config.ts",

    value: {
      routes: "src/routes",
    },
  },

  groups: [
    {
      id: "root",
      path: "/",
      routes: ["GET /users/:id"],
    },
  ],

  routes: [
    {
      fullPath: "/users/:id",

      groupPath: "",
      id: "GET /users/:id",

      localPath: "/users/:id",

      method: "get" as const,

      routerPath: "router/users/[id]",

      routeSegments: [
        {
          kind: "static" as const,
          value: "users",
        },
        {
          kind: "param" as const,
          name: "id",
        },
      ],

      source: "src/routes/users/endpoints/[id].get.ts",
    },
  ],
};

describe("code generation", () => {
  test("generates a path-specialized HTTP helper", () => {
    const output = generate(plan(model, ".nooh"), model);

    const module = output.modules.find(
      (candidate) => candidate.id === ".nooh/router/users/[id].ts"
    );

    expect(module?.code).toContain('type Path = "/users/:id";');

    expect(module?.code).toContain("export function get");

    expect(module?.code).toContain("Handler<App, Path>");
  });

  test("generates Standard Schema validation support", () => {
    const output = generate(plan(model, ".nooh"), model);

    const module = output.modules.find(
      (candidate) => candidate.id === ".nooh/router/users/[id].ts"
    );

    expect(module?.code).toContain("@hono/standard-validator");

    expect(module?.code).toContain('sValidator("json"');

    expect(module?.code).toContain('sValidator("query"');
  });

  test("generates the shared middleware helper", () => {
    const output = generate(plan(model, ".nooh"), model);

    const module = output.modules.find(
      (candidate) => candidate.id === ".nooh/router/middleware.ts"
    );

    expect(module?.code).toBe(
      [
        `import { createMiddleware } from "hono/factory";`,
        `import type { App } from "../types.js";`,
        "",
        "export const middleware = createMiddleware<App>;",
        "",
      ].join("\n")
    );
  });

  test("generates native Hono application code", () => {
    const output = generate(plan(model, ".nooh"), model);

    const app = output.modules.find(
      (candidate) => candidate.id === ".nooh/app.ts"
    );

    expect(app?.code).toContain("new Hono<App>()");
    expect(app?.code).toContain("AppType = typeof app");
  });
});
