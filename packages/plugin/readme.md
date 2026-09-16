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
  <a href="https://www.npmjs.com/package/@nooh-ts/plugin">npm</a>
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/%40nooh-ts%2Fplugin?style=flat-square" alt="npm version" />
  <img src="https://img.shields.io/github/license/nehu3n/nooh?style=flat-square" alt="License" />
</p>

## About

[`@nooh-ts/plugin`](https://www.npmjs.com/package/@nooh-ts/plugin) provides build-tool integrations for [**Nooh**](https://github.com/nehu3n/nooh).

It connects the Nooh compiler to your build tool, handling compilation, generated output, module resolution, and development-time updates within the host environment.

The plugin keeps Nooh integrated into your existing build workflow without introducing a separate runtime.

## Install

Install the plugin as a development dependency:

```bash
pnpm add -D @nooh-ts/plugin
```

Then use the adapter for your build tool.

## Vite

```ts
import { defineConfig } from "vite";
import nooh from "@nooh-ts/plugin/vite";

export default defineConfig({
  plugins: [nooh()],
});
```

Nooh compiles your application and keeps the generated `.nooh/` output synchronized during development.

## Supported bundlers

The following build tools are currently supported:

* Vite
* Rollup
* Rolldown
* Webpack
* esbuild
* Rspack
* Rsbuild
* Farm
* Bun

Each integration exposes a native adapter for its respective build tool while using the same Nooh compiler underneath.

## Generated modules

The plugin resolves Nooh's generated modules, allowing routes to import generated HTTP helpers:

```ts
import { get } from "@router/users/[id]";

export default get((c) => {
  const id = c.req.param("id");
  return c.json({ id });
});
```

The `@router/*` import resolves to the corresponding generated module inside `.nooh/router/`.

## Development

During development, the plugin watches the relevant project files and recompiles Nooh when the route tree or configuration changes.

```text
src/
└── routes/
    └── users/
        └── [id].get.ts
            │
            ▼
      Nooh compiler
            │
            ▼
         .nooh/
            │
            ▼
       build tool
```

The generated output remains ordinary TypeScript and Hono code, while the host build tool remains responsible for bundling and execution.

## Documentation

The full documentation covers build-tool integrations, configuration, module resolution, development workflows, and supported adapters.

**[Read the documentation →](https://nooh-ts.pages.dev)**

## License

This project is licensed under the [MIT License](https://github.com/nehu3n/nooh/blob/main/license).
