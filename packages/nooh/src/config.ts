import type { Env } from "hono";

import type { NoohErrorHandler } from "@/errors";
import type { NoohValidatorOptions } from "@/validation";

export interface NoohConfigOptions<Environment extends Env = Env> {
  readonly dependencies?: string;
  readonly onError?: NoohErrorHandler<Environment>;
  readonly routes?: string;
  readonly validator?: NoohValidatorOptions;
}

export interface NoohConfig<Environment extends Env = Env>
  extends NoohConfigOptions<Environment> {
  readonly __nooh_env: Environment;
}

export type ConfigEnvironment<T> = T extends {
  readonly __nooh_env: infer Environment;
}
  ? Environment
  : never;

export interface NoohGroupOptions<
  Environment extends Env = Env,
  Middleware = unknown,
> {
  readonly middleware?: readonly Middleware[];
  readonly onError?: NoohErrorHandler<Environment>;
}

export interface NoohGroup<
  Environment extends Env = Env,
  Middleware = unknown,
> {
  readonly middleware?: readonly Middleware[];
  readonly onError?: NoohErrorHandler<Environment>;
}

export const config = <Environment extends Env>(
  options: NoohConfigOptions<Environment> = {}
): NoohConfig<Environment> => options as NoohConfig<Environment>;

export const group = <Environment extends Env = Env, Middleware = unknown>(
  options: NoohGroupOptions<Environment, Middleware> = {}
): NoohGroup<Environment, Middleware> => options;
