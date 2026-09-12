import { createCompiler } from "@/compiler";
import type { Compilation, CompileInput } from "@/types";

export const compile = (input: CompileInput): Promise<Compilation> =>
  createCompiler().compile(input);
