/** biome-ignore-all lint/performance/noBarrelFile: ... */

export { compile } from "@/compile";
export { createCompiler } from "@/compiler";
export { diff } from "@/diff";
export { generate } from "@/generate";
export { analyze } from "@/pipeline/analyze";
export { loadConfig } from "@/pipeline/config";
export {
  createDependencyGraph,
  dependencyClosure,
  loadDependencyGraph,
} from "@/pipeline/dependencies";
export { discover } from "@/pipeline/discover";
export { parse } from "@/pipeline/parse";
export { plan } from "@/pipeline/plan";
export { recompile } from "@/recompile";

export type {
  Compilation,
  CompilationPlan,
  CompileInput,
  CompileOptions,
  ConfigLoadResult,
  DependencyDeclaration,
  DependencyGraph,
  DependencyNode,
  DependencyScope,
  Diagnostic,
  DiscoveredEndpoint,
  DiscoveredProject,
  GeneratedModule,
  GeneratedOutput,
  LoadedConfig,
  ModuleKind,
  ModuleLoader,
  ModulePlan,
  NoohCompiler,
  OutputDiff,
  ParsedProject,
  ParsedRoute,
  ProjectModel,
  RecompileInput,
  RouteGroup,
  RouteMethod,
  RouteModel,
  RouteSegment,
  RuntimeConfig,
  SourceFile,
  SourceSnapshot,
} from "@/types";
