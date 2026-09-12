import { describe, expect, test } from "vitest";

import { analyze } from "@/analyze";
import { parseEndpoint } from "@/route-parser";

const endpoint = (localPath: string, groupPath = "") => ({
  endpointsRoot: `src/routes/${groupPath ? `${groupPath}/` : ""}endpoints`,

  groupPath,

  localPath,
  source: `src/routes/${
    groupPath ? `${groupPath}/` : ""
  }endpoints/${localPath}`,
});

const config = {
  routesRoot: "src/routes",
  source: "src/config.ts",

  value: {
    routes: "src/routes",
  },
};

describe("route parsing", () => {
  test("parses static, parameter, and index routes", () => {
    const result = parseEndpoint(endpoint("users/[id].get.ts"));

    expect(result.diagnostics).toHaveLength(0);

    expect(result.route).toEqual({
      groupPath: "",
      method: "get",
      rawSegments: ["users", "[id]"],
      segments: [
        {
          kind: "static",
          value: "users",
        },
        {
          kind: "param",
          name: "id",
        },
      ],
      source: "src/routes/endpoints/users/[id].get.ts",
    });

    const index = parseEndpoint(endpoint("users/index.post.ts"));

    expect(index.route?.rawSegments).toEqual(["users"]);
    expect(index.route?.method).toBe("post");
  });

  test("parses splat routes", () => {
    const result = parseEndpoint(endpoint("files/[...path].get.ts"));

    expect(result.diagnostics).toHaveLength(0);

    expect(result.route?.segments).toEqual([
      {
        kind: "static",
        value: "files",
      },
      {
        kind: "splat",
        name: "path",
      },
    ]);
  });

  test("rejects invalid endpoint filenames", () => {
    const result = parseEndpoint(endpoint("users/foo.ts"));

    expect(result.route).toBeUndefined();
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.code).toBe("NOOH001");
  });

  test("builds the semantic route model and catches duplicates", () => {
    const first = parseEndpoint(endpoint("users/[id].get.ts"));

    const second = parseEndpoint(endpoint("users/[id].get.ts"));

    const parsed = {
      diagnostics: [],
      // biome-ignore lint/style/noNonNullAssertion: we know the route is defined
      routes: [first.route!, second.route!],
    };

    const result = analyze(parsed, config);

    expect(result.model.routes).toHaveLength(1);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.code).toBe("NOOH005");
    expect(result.model.routes[0]?.fullPath).toBe("/users/:id");
  });
});
