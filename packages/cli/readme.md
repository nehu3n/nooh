<p align="center">
  <img src="https://github.com/nehu3n/nooh/blob/main/.github/assets/nooh-banner.webp" alt="Nooh" width="750" />
</p>

<p align="center">
  <strong>🧊 A zero-dependency, compile-time metaframework for building type-safe file-based Hono APIs.</strong>
</p>

<p align="center">
  <a href="https://nooh-ts.pages.dev">Documentation</a>
  ·
  <a href="https://github.com/nehu3n/nooh">GitHub</a>
  ·
  <a href="https://www.npmjs.com/package/@nooh-ts/cli">npm</a>
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/%40nooh-ts%2Fcli?style=flat-square" alt="npm version" />
  <img src="https://img.shields.io/github/license/nehu3n/nooh?style=flat-square" alt="License" />
</p>

## About

[`@nooh-ts/cli`](https://www.npmjs.com/package/@nooh-ts/cli) is the official command-line interface for [**Nooh**](https://github.com/nehu3n/nooh).

It handles project-level tasks such as loading configuration, compiling your application, generating `.nooh/`, watching for changes, and running your development command.

The compiler itself remains independent and reusable. The CLI provides the development workflow around it.

## Install

Install the CLI as a development dependency:

```bash
pnpm add -D @nooh-ts/cli
```

And use it directly:

```bash
pnpm nooh build
```

## Commands

Build your application:

```bash
nooh build
```

Watch for changes and rebuild automatically:

```bash
nooh watch
```

Run your application in development:

```bash
nooh dev -- pnpm exec tsx src/index.ts
```

The CLI compiles your routes before starting the command and keeps the generated application up to date during development.

## Generated output

Nooh generates its compiled application into `.nooh/`:

```text
.nooh/
├── app.ts
└── router/
    ├── hello.ts
    └── hello/
        └── [id].ts
```

The generated files are native TypeScript and Hono code. They can be consumed directly by your application without a Nooh runtime.

## Configuration

The CLI reads your Nooh project configuration and passes it to the compiler:

```ts
import { config } from "@nooh-ts/nooh";

export interface App {
  Variables: {
    userId: string;
  };
}

export default config<App>({
  routes: "src/routes",
});
```

The CLI owns the project lifecycle; the compiler remains focused on transforming your filesystem into generated Hono code.

## Documentation

The full documentation covers the CLI, project configuration, development workflow, compiler architecture, and integrations.

**[Read the documentation →](https://nooh-ts.pages.dev)**

## License

This project is licensed under the [MIT License](https://github.com/nehu3n/nooh/blob/main/license).
