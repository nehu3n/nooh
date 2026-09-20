import { generate } from "@/generate";

import { analyze } from "@/pipeline/analyze";
import { loadConfig } from "@/pipeline/config";
import { loadDependencyGraph } from "@/pipeline/dependencies";
import { discover } from "@/pipeline/discover";
import { parse } from "@/pipeline/parse";
import { plan } from "@/pipeline/plan";

import type { NoohCompiler } from "@/types";

export const createCompiler = (): NoohCompiler => ({
  analyze,

  compile: async (input) => {
    const configResult = await loadConfig(input);

    if (!configResult.config) {
      return {
        diagnostics: configResult.diagnostics,
        model: {
          config: {
            root: input.root ? input.root.replaceAll("\\", "/") : "",
            routesRoot: "",
            source: input.config,
            value: {},
          },

          dependencies: {
            nodes: new Map(),
            order: [],
          },

          groups: [],
          routes: [],
        },
        output: null,
        plan: null,
      };
    }

    const discovered = discover(input.sources, configResult.config);
    const parsed = parse(discovered);

    const dependencyResult = await loadDependencyGraph(
      discovered.dependencies,
      input.loader
    );

    const analyzed = analyze(
      parsed,
      configResult.config,
      dependencyResult.graph
    );

    const diagnostics = [
      ...configResult.diagnostics,
      ...dependencyResult.diagnostics,
      ...analyzed.diagnostics,
    ];

    const hasErrors = diagnostics.some(
      (diagnostic) => diagnostic.severity === "error"
    );

    if (hasErrors) {
      return {
        diagnostics,
        model: analyzed.model,
        output: null,
        plan: null,
      };
    }

    const compilationPlan = plan(analyzed.model, input.options?.outputRoot);

    const output = generate(compilationPlan, analyzed.model);

    return {
      diagnostics,
      model: analyzed.model,
      output,
      plan: compilationPlan,
    };
  },

  discover,
  generate,
  loadConfig,
  parse,
  plan,
});
