import type { CompilationPlan } from "@/types";

/**
 * Returns the output file path for a route group module.
 * The root group uses the reserved name "root".
 */
export const groupModuleId = (
  plan: CompilationPlan,
  groupId: string
): string => {
  if (groupId === "root") {
    return `${plan.outputRoot}/groups/root.ts`;
  }

  return `${plan.outputRoot}/groups/${groupId}.ts`;
};
