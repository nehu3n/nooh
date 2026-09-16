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
  <a href="https://www.npmjs.com/package/@nooh-ts/compiler">npm</a>
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/%40nooh-ts%2Fcompiler?style=flat-square" alt="npm version" />
  <img src="https://img.shields.io/github/license/nehu3n/nooh?style=flat-square" alt="License" />
</p>

## About

[`@nooh-ts/compiler`](https://www.npmjs.com/package/@nooh-ts/compiler) is the core compiler behind [**Nooh**](https://github.com/nehu3n/nooh).

It transforms a Nooh project into generated, native Hono code based on its filesystem structure, configuration, routes, groups, middleware, and dependencies.

The compiler is designed to be small, deterministic, and independent of any particular build tool or development environment.

## How it works

A Nooh project is compiled through a simple pipeline:

```text
Project files
     ↓
Discovery
     ↓
Parsing
     ↓
Analysis
     ↓
Planning
     ↓
Code generation
     ↓
Native Hono application
```

For example:

```text
src/
└── routes/
    └── users/
        └── [id].get.ts
```

is compiled into a generated router that exposes the corresponding HTTP method:

```ts
import { get } from "@router/users/[id]";

export default get((c) => {
  const id = c.req.param("id");

  return c.json({ id });
});
```

The compiler resolves the filesystem structure and generates the Hono application that connects everything together.

## Use the compiler directly

The compiler can be used independently of the official CLI or any particular bundler:

```ts
import { compile } from "@nooh-ts/compiler";

const result = await compile({
  root: process.cwd(),
  sources: { files },
});
```

This makes the compiler suitable for custom tooling, development environments, build systems, and integrations.

## No runtime

The compiler does not introduce a Nooh runtime.

It generates ordinary TypeScript and Hono code:

```text
Nooh source
    ↓
@nooh-ts/compiler
    ↓
generated TypeScript
    ↓
Hono
    ↓
your runtime
```

Once compilation is complete, Nooh is out of the runtime path.

## Integrations

The compiler is intentionally independent from:

* CLIs
* Vite
* Rollup
* Rolldown
* Webpack
* esbuild
* Bun
* Node.js runtimes
* deployment platforms

Build-tool integrations can use the compiler while keeping their own lifecycle, module resolution, and development model.

## Documentation

The full documentation covers the compilation pipeline, route discovery, analysis, generation, diagnostics, and compiler API.

**[Read the documentation →](https://nooh-ts.pages.dev)**

## License

This project is licensed under the [MIT License](https://github.com/nehu3n/nooh/blob/main/license).
