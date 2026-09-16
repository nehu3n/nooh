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
  <a href="https://www.npmjs.com/package/@nooh-ts/nooh">npm</a>
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/%40nooh-ts%2Fnooh?style=flat-square" alt="npm version" />
  <img src="https://img.shields.io/github/license/nehu3n/nooh?style=flat-square" alt="License" />
</p>

## Why Nooh

[**Hono**](https://hono.dev) is a great backend framework—fast, lightweight, and runtime-agnostic. But as an application grows, organizing routes, middleware, validation, and project structure is largely left to the developer.

**Nooh** adds a filesystem-first development model on top of Hono. Your files define the structure of your API, while a fast compiler generates the typed route functions and native Hono application behind them.

Everything is compiled ahead of runtime. The Hono ecosystem works exactly as it always has, and your entry point remains runtime-agnostic.

## Get started

The fastest way to start is with the official project template:

```bash
pnpm create @nooh-ts/template
```

Follow the interactive setup and start building immediately.

For a manual setup:

```bash
pnpm add @nooh-ts/nooh hono @hono/standard-validator
pnpm add -D @nooh-ts/cli
```

Then create your project around a filesystem-based route tree:

```text
nooh.config.ts
src/
├── index.ts
├── middleware/
│   └── logger.ts
└── routes/
    ├── index.get.ts
    └── users/
        ├── [id].post.ts
        └── index.get.ts
```

A route is just a file:

```ts
import { get } from "@router/users/[id]";

export default get((c) => {
  const id = c.req.param("id");

  return c.json({ id });
});
```

Which becomes:

```text
GET /users/:id
```

Then build your application:

```bash
nooh build
```

Nooh generates a native Hono application in `.nooh/`, which you can use from your normal Hono entry point.

```ts
import app from "../.nooh/app";

export default app;
```

## Documentation

The full documentation covers routing, groups, middleware, validation, the CLI, compiler architecture, and build-tool integrations.

**[Read the documentation →](https://nooh-ts.pages.dev)**

## License

This project is licensed under the [MIT License](https://github.com/nehu3n/nooh/blob/main/license).
