import { createCompiler } from "@/compiler";
import type { Compilation, RecompileInput } from "@/types";

export const recompile = (input: RecompileInput): Promise<Compilation> => {
  const compiler = createCompiler();

  const config = input.config ?? input.previous.model.config.source;

  return compiler.compile({
    config,
    loader: input.loader,
    ...(input.options !== undefined && { options: input.options }),
    sources: input.snapshot,
  });
};
