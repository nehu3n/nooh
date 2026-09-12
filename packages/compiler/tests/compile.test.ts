/** biome-ignore-all lint/suspicious/useAwait: ... */
import { describe, expect, test } from "vitest";

import { compile } from "@/compile";

describe("compile", () => {
  test("compiles a minimal Nooh project", async () => {
    const result = await compile({
      config: "src/config.ts",

      loader: {
        async loadDefault(path) {
          expect(path).toBe("src/config.ts");

          return {
            routes: "src/routes",
          };
        },
      },

      options: {
        outputRoot: ".nooh",
      },

      sources: {
        files: [
          {
            content: "",
            path: "src/config.ts",
          },
          {
            content: "",
            path: "src/routes/users/endpoints/index.get.ts",
          },
          {
            content: "",
            path: "src/routes/users/endpoints/[id].get.ts",
          },
        ],
      },
    });

    expect(result.diagnostics).toHaveLength(0);

    expect(
      result.model.routes.map((route) => ({
        method: route.method,
        path: route.fullPath,
      }))
    ).toEqual([
      {
        method: "get",
        path: "/users",
      },
      {
        method: "get",
        path: "/users/:id",
      },
    ]);

    expect(
      result.output?.modules.some(
        (module) => module.id === ".nooh/router/middleware.ts"
      )
    ).toBe(true);

    expect(
      result.output?.modules.some(
        (module) => module.id === ".nooh/router/users/[id].ts"
      )
    ).toBe(true);

    expect(
      result.output?.modules.some((module) => module.id === ".nooh/app.ts")
    ).toBe(true);
  });

  test("returns diagnostics for failed config loading", async () => {
    const result = await compile({
      config: "src/config.ts",

      loader: {
        async loadDefault() {
          throw new Error("config failed");
        },
      },

      sources: {
        files: [],
      },
    });

    expect(result.output).toBeNull();
    expect(result.plan).toBeNull();
    expect(result.diagnostics).toHaveLength(1);

    expect(result.diagnostics[0]?.code).toBe("NOOH010");
  });
});
