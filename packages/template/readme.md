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
  <a href="https://www.npmjs.com/package/@nooh-ts/template">npm</a>
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/%40nooh-ts%2Ftemplate?style=flat-square" alt="npm version" />
  <img src="https://img.shields.io/github/license/nehu3n/nooh?style=flat-square" alt="License" />
</p>

## About

[`@nooh-ts/template`](https://www.npmjs.com/package/@nooh-ts/template) is the official project template for [**Nooh**](https://github.com/nehu3n/nooh).

It provides the recommended starting structure for a Nooh application, including the project configuration, filesystem-based routes, development setup, and required dependencies.

## Create a project

Create a new Nooh application with:

```bash
pnpm create @nooh-ts/template
```

The interactive setup will guide you through creating your project.

Then start developing:

```bash
cd my-app
pnpm dev
```

## Project structure

A new project starts with a minimal filesystem-based structure:

```text
src/
├── config.ts
├── index.ts
├── middleware/
└── routes/
    └── hello/
        ├── $.ts
        └── endpoints/
            └── index.get.ts
```

Routes are defined by their location and filename:

```ts
import { get } from "@router/hello";

export default get((c) => c.json({ hello: "world" }));
```

Nooh compiles the route tree into a native Hono application.

## Build

Build the application with:

```bash
pnpm build
```

The generated application is written to:

```text
.nooh/
├── app.ts
└── router/
```

You can then use the generated Hono application from your normal entry point.

## Documentation

The full documentation covers routing, groups, middleware, validation, dependency injection, the CLI, compiler architecture, and build-tool integrations.

**[Read the documentation →](https://nooh-ts.pages.dev)**

## License

This project is licensed under the [MIT License](https://github.com/nehu3n/nooh/blob/main/license).