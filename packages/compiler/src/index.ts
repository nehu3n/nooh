/** biome-ignore-all lint/performance/noBarrelFile: ... */
export { analyze } from "@/analyze";
export { compile } from "@/compile";
export { loadConfig } from "@/config";
export { discover } from "@/discover";
export { generate } from "@/generate";
export { parse } from "@/parse";
export { plan } from "@/plan";

export type {
  Compilation,
  CompilationPlan,
  CompileInput,
  CompileOptions,
  Diagnostic,
  DiscoveredEndpoint,
  DiscoveredProject,
  GeneratedModule,
  GeneratedOutput,
  LoadedConfig,
  ModuleKind,
  ModuleLoader,
  ModulePlan,
  ParsedProject,
  ParsedRoute,
  ProjectModel,
  RouteGroup,
  RouteMethod,
  RouteModel,
  RouteSegment,
  RuntimeConfig,
  SourceFile,
  SourceSnapshot,
} from "@/types";
