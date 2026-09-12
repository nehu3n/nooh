import { analyze } from "@/analyze";
import { loadConfig } from "@/config";
import { discover } from "@/discover";
import { generate } from "@/generate";
import { parse } from "@/parse";
import { plan } from "@/plan";

import type { Compilation, CompileInput } from "@/types";

const hasErrors = (diagnostics: Compilation["diagnostics"]): boolean =>
  diagnostics.some((diagnostic) => diagnostic.severity === "error");

export const compile = async (input: CompileInput): Promise<Compilation> => {
  const config = await loadConfig(input);

  const discovered = discover(input.sources, config);
  const parsed = parse(discovered);
  const analyzed = analyze(parsed, config);

  const { diagnostics } = analyzed;

  if (hasErrors(diagnostics)) {
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
};
