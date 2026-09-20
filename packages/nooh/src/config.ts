export interface NoohConfigOptions {
  readonly dependencies?: string;
  readonly routes?: string;
}

export interface NoohConfig<Environment> extends NoohConfigOptions {
  readonly __nooh_env: Environment;
}

export type ConfigEnvironment<T> = T extends {
  readonly __nooh_env: infer Environment;
}
  ? Environment
  : never;

export interface NoohGroupOptions<Middleware = unknown> {
  readonly middleware?: readonly Middleware[];
}

export interface NoohGroup<Middleware = unknown> {
  readonly middleware?: readonly Middleware[];
}

export const config = <Environment>(
  options: NoohConfigOptions = {}
): NoohConfig<Environment> => options as NoohConfig<Environment>;

export const group = <Middleware = unknown>(
  options: NoohGroupOptions<Middleware> = {}
): NoohGroup<Middleware> => options;
