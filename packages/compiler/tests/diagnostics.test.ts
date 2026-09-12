import { describe, expect, test } from "vitest";

import { discover } from "@/discover";
import { parse } from "@/parse";

const config = {
  routesRoot: "src/routes",
  source: "src/config.ts",

  value: {
    routes: "src/routes",
  },
};

describe("discovery and diagnostics", () => {
  test("ignores files outside routes", () => {
    const snapshot = {
      files: [
        {
          content: "",
          path: "src/routes/users/endpoints/index.get.ts",
        },
        {
          content: "",
          path: "src/services/users.ts",
        },
        {
          content: "",
          path: "README.md",
        },
      ],
    };

    const result = discover(snapshot, config);

    expect(result.endpoints).toHaveLength(1);

    expect(result.endpoints[0]?.source).toBe(
      "src/routes/users/endpoints/index.get.ts"
    );
  });

  test("returns diagnostics instead of throwing", () => {
    const result = parse({
      config,
      endpoints: [
        {
          endpointsRoot: "src/routes/users/endpoints",

          groupPath: "users",

          localPath: "bad.ts",
          source: "src/routes/users/endpoints/bad.ts",
        },
      ],
    });

    expect(result.routes).toHaveLength(0);
    expect(result.diagnostics).toHaveLength(1);

    expect(result.diagnostics[0]?.severity).toBe("error");
  });
});
