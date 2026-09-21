import type { Context, Env } from "hono";
import type { HandlerResponse, HTTPResponseError } from "hono/types";

// biome-ignore lint/suspicious/noExplicitAny: ...
export type ErrorConstructor = new (...args: any[]) => Error;

export type ErrorFactory<Constructor extends ErrorConstructor> = (
  ...args: ConstructorParameters<Constructor>
) => InstanceType<Constructor>;

export type ErrorContext<Errors extends Record<string, ErrorConstructor>> = {
  readonly [Name in keyof Errors]: ErrorFactory<Errors[Name]>;
};

export type NoohErrorHandler<
  Environment extends Env = Env,
  Path extends string = string,
> = (
  error: Error | HTTPResponseError,
  c: Context<Environment, Path>
) => HandlerResponse<unknown>;
