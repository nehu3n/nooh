import type { GeneratedModule, GeneratedOutput, OutputDiff } from "@/types";

export const diff = (
  previous: GeneratedOutput,
  next: GeneratedOutput
): OutputDiff => {
  const previousMap = new Map(
    previous.modules.map((module) => [module.id, module])
  );

  const nextMap = new Map(next.modules.map((module) => [module.id, module]));

  const added: GeneratedModule[] = [];
  const changed: GeneratedModule[] = [];
  const unchanged: GeneratedModule[] = [];
  const removed: string[] = [];

  for (const module of next.modules) {
    const previousModule = previousMap.get(module.id);

    if (!previousModule) {
      added.push(module);
      continue;
    }

    if (previousModule.code !== module.code) {
      changed.push(module);
      continue;
    }

    unchanged.push(module);
  }

  for (const module of previous.modules) {
    if (!nextMap.has(module.id)) {
      removed.push(module.id);
    }
  }

  return {
    added,
    changed,
    removed,
    unchanged,
  };
};
