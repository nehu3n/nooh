export interface NoohConfigOptions {
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

export const config = <Environment>(
  options: NoohConfigOptions = {}
): NoohConfig<Environment> => options as NoohConfig<Environment>;
