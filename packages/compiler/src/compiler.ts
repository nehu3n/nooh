import { generate, generateRouteIntrospection } from "@/generate";

import { introspectCompilation } from "@/introspect";

import { analyze } from "@/pipeline/analyze";
import { loadConfig } from "@/pipeline/config";
import { discover } from "@/pipeline/discover";
import { parse } from "@/pipeline/parse";
import { plan } from "@/pipeline/plan";

import type {
  Compilation,
  CompileInput,
  IntrospectionInput,
  IntrospectionResult,
  NoohCompiler,
} from "@/types";

const emptyDependencies = {
  nodes: new Map(),
  order: [],
};

export const createCompiler = (): NoohCompiler => ({
  analyze,

  compile: async (input: CompileInput): Promise<Compilation> => {
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

          dependencies: emptyDependencies,

          groups: [],
          routeDependencies: [],
          routes: [],
        },
        output: null,
        plan: null,
      };
    }

    const discovered = discover(input.sources, configResult.config);
    const parsed = parse(discovered);

    const analyzed = analyze(parsed, configResult.config, emptyDependencies);

    const diagnostics = [...configResult.diagnostics, ...analyzed.diagnostics];

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
  generateRouteIntrospection,
  loadConfig,
  parse,
  plan,
});

export const introspect = (
  input: IntrospectionInput
): Promise<IntrospectionResult> => introspectCompilation(input);
