import { describe, expect, test } from "vitest";

import {
  dirname,
  ensureLeadingSlash,
  normalizePath,
  relativeModuleSpecifier,
} from "@/path";

describe("path utilities", () => {
  test("normalizes filesystem separators", () => {
    expect(normalizePath("src\\routes\\users\\[id].get.ts")).toBe(
      "src/routes/users/[id].get.ts"
    );
  });

  test("normalizes dot segments", () => {
    expect(normalizePath("src/./routes/users/../users/index.get.ts")).toBe(
      "src/routes/users/index.get.ts"
    );
  });

  test("builds leading route slashes", () => {
    expect(ensureLeadingSlash("users/:id")).toBe("/users/:id");

    expect(ensureLeadingSlash("/users/:id")).toBe("/users/:id");

    expect(ensureLeadingSlash("")).toBe("/");
  });

  test("computes relative generated imports", () => {
    expect(
      relativeModuleSpecifier(".nooh/router/users/[id].ts", ".nooh/types.ts")
    ).toBe("../../types.js");

    expect(
      relativeModuleSpecifier(
        ".nooh/groups/users.ts",
        "src/routes/users/endpoints/[id].get.ts"
      )
    ).toBe("../../src/routes/users/endpoints/[id].get.js");
  });

  test("computes module directory", () => {
    expect(dirname(".nooh/router/users/[id].ts")).toBe(".nooh/router/users");
  });
});
