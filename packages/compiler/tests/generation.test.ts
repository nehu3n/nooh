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
  test("generates a typed router module", () => {
    const compilationPlan = plan(model, ".nooh");

    const output = generate(compilationPlan, model);

    const module = output.modules.find(
      (candidate) => candidate.id === ".nooh/router/users/[id].ts"
    );

    expect(module).toBeDefined();

    expect(module?.code).toContain("Handler<App, Path>");

    expect(module?.code).toContain('Path = "/users/:id"');

    expect(module?.code).toContain('sValidator("json"');

    expect(module?.code).toContain('sValidator("query"');

    expect(module?.code).not.toContain("@/router");

    expect(module?.code).not.toContain("@/config");
  });

  test("generates the shared middleware helper", () => {
    const compilationPlan = plan(model, ".nooh");

    const output = generate(compilationPlan, model);

    const module = output.modules.find(
      (candidate) => candidate.id === ".nooh/router/middleware.ts"
    );

    expect(module).toBeDefined();

    expect(module?.code).toContain("createMiddleware<App>");
  });

  test("generates native Hono app code", () => {
    const compilationPlan = plan(model, ".nooh");

    const output = generate(compilationPlan, model);

    const app = output.modules.find(
      (candidate) => candidate.id === ".nooh/app.ts"
    );

    expect(app).toBeDefined();

    expect(app?.code).toContain("new Hono<App>()");
    expect(app?.code).toContain("AppType = typeof app");
  });
});
