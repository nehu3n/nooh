/** biome-ignore-all lint/performance/noBarrelFile: ... */

export type {
  ConfigEnvironment,
  NoohConfig,
  NoohConfigOptions,
  NoohGroup,
  NoohGroupOptions,
} from "@/config";

export {
  config,
  group,
} from "@/config";
export type {
  AnyDependencyReference,
  Container,
  DependencyContext,
  DependencyDefinition,
  DependencyEntry,
  DependencyName,
  DependencyReference,
  DependencyResolutionContext,
  DependencyScope,
  DependencyValue,
  DuplicateDependency,
  InvalidDependencyScope,
  ReservedDependencyName,
  ValidateDependencies,
  ValidateDependencyScopes,
} from "@/di";
export {
  container,
  DependencyCycleError,
  request,
  singleton,
  transient,
  value,
} from "@/di";
