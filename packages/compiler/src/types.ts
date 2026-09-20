export const ROUTE_METHODS = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "options",
  "head",
  "all",
] as const;

export type RouteMethod = (typeof ROUTE_METHODS)[number];

export interface SourceFile {
  readonly content: string;
  readonly path: string;
}

export interface SourceSnapshot {
  readonly files: readonly SourceFile[];
}

export interface ModuleLoader {
  loadDefault: (modulePath: string) => Promise<unknown>;
}

export interface CompileOptions {
  readonly outputRoot?: string;
}

export interface CompileInput {
  readonly config: string;
  readonly loader: ModuleLoader;
  readonly options?: CompileOptions;
  readonly root?: string;
  readonly sources: SourceSnapshot;
}

export interface RuntimeConfig {
  readonly routes?: string | undefined;
}

export interface LoadedConfig {
  readonly root: string;
  readonly routesRoot: string;
  readonly source: string;
  readonly value: RuntimeConfig;
}

export interface ConfigLoadResult {
  readonly config?: LoadedConfig;
  readonly diagnostics: readonly Diagnostic[];
}

export interface DiscoveredEndpoint {
  readonly groupPath: string;
  readonly localPath: string;
  readonly source: string;
}

export interface DiscoveredGroup {
  readonly groupPath: string;
  readonly source: string;
}

export interface DiscoveredProject {
  readonly config: LoadedConfig;
  readonly endpoints: readonly DiscoveredEndpoint[];
  readonly groups: readonly DiscoveredGroup[];
}

export type RouteSegment =
  | {
      readonly kind: "static";
      readonly value: string;
    }
  | {
      readonly kind: "param";
      readonly name: string;
    }
  | {
      readonly kind: "splat";
      readonly name?: string;
    };

export interface ParsedRoute {
  readonly groupPath: string;
  readonly method: RouteMethod;
  readonly rawSegments: readonly string[];
  readonly segments: readonly RouteSegment[];
  readonly source: string;
}

export interface ParsedGroup {
  readonly groupPath: string;
  readonly source: string;
}

export interface ParsedProject {
  readonly diagnostics: readonly Diagnostic[];
  readonly groups: readonly ParsedGroup[];
  readonly routes: readonly ParsedRoute[];
}

export interface RouteModel {
  readonly fullPath: string;

  readonly groupPath: string;
  readonly id: string;

  readonly localPath: string;

  readonly method: RouteMethod;

  readonly routerPath: string;
  readonly routeSegments: readonly RouteSegment[];
  readonly source: string;
}

export interface RouteGroup {
  readonly children: readonly string[];
  readonly configSource?: string;
  readonly id: string;
  readonly parentId?: string;
  readonly path: string;
  readonly routes: readonly string[];
}

export interface ProjectModel {
  readonly config: LoadedConfig;
  readonly groups: readonly RouteGroup[];
  readonly routes: readonly RouteModel[];
}

export type DiagnosticSeverity = "error" | "warning" | "info";

export interface Diagnostic {
  readonly code: string;
  readonly file?: string;
  readonly message: string;
  readonly severity: DiagnosticSeverity;
}

export type ModuleKind =
  | "types"
  | "router"
  | "middleware"
  | "group"
  | "di"
  | "app";

export interface ModulePlan {
  readonly groupId?: string;
  readonly id: string;
  readonly kind: ModuleKind;
  readonly routeId?: string;
}

export interface CompilationPlan {
  readonly modules: readonly ModulePlan[];
  readonly outputRoot: string;
}

export interface GeneratedModule {
  readonly code: string;
  readonly id: string;
  readonly kind: ModuleKind;
}

export interface GeneratedOutput {
  readonly modules: readonly GeneratedModule[];
}

export interface Compilation {
  readonly diagnostics: readonly Diagnostic[];
  readonly model: ProjectModel;
  readonly output: GeneratedOutput | null;
  readonly plan: CompilationPlan | null;
}

export interface NoohCompiler {
  analyze: (
    parsed: ParsedProject,
    config: LoadedConfig
  ) => {
    model: ProjectModel;
    diagnostics: readonly Diagnostic[];
  };
  compile: (input: CompileInput) => Promise<Compilation>;
  discover: (
    sources: CompileInput["sources"],
    config: LoadedConfig
  ) => DiscoveredProject;
  generate: (plan: CompilationPlan, model: ProjectModel) => GeneratedOutput;
  loadConfig: (input: CompileInput) => Promise<ConfigLoadResult>;
  parse: (project: DiscoveredProject) => ParsedProject;
  plan: (model: ProjectModel, outputRoot?: string) => CompilationPlan;
}

export interface OutputDiff {
  readonly added: readonly GeneratedModule[];
  readonly changed: readonly GeneratedModule[];
  readonly removed: readonly string[];
  readonly unchanged: readonly GeneratedModule[];
}

export interface RecompileInput {
  readonly config?: string;
  readonly loader: CompileInput["loader"];
  readonly options?: CompileInput["options"];
  readonly previous: Compilation;
  readonly snapshot: SourceSnapshot;
}
