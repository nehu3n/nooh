export type NoohRequestValidationTarget =
  | "json"
  | "form"
  | "query"
  | "param"
  | "header"
  | "cookie";

export type NoohValidationTarget = NoohRequestValidationTarget | "response";

export interface NoohStandardSchema {
  readonly "~standard": {
    readonly validate: (value: never, ...args: never[]) => unknown;
    readonly types?: {
      readonly input?: unknown;
      readonly output?: unknown;
    };
  };
}

export type NoohStandardSchemaInput<Schema extends NoohStandardSchema> =
  Schema["~standard"]["types"] extends {
    readonly input?: infer Input;
  }
    ? Input
    : unknown;

export type NoohStandardSchemaOutput<Schema extends NoohStandardSchema> =
  Schema["~standard"]["types"] extends {
    readonly output?: infer Output;
  }
    ? Output
    : NoohStandardSchemaInput<Schema>;

export type NoohValidatorEngine = (...args: never[]) => unknown;

export interface NoohValidatorOptions {
  readonly engine?: NoohValidatorEngine;
}
