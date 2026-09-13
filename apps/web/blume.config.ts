import { defineConfig } from "blume";

export default defineConfig({
  content: {
    root: "docs",
  },
  description:
    "A dependency-free, compile-time metaframework for building type-safe file-based Hono APIs.",

  github: {
    owner: "nehu3n",
    repo: "https://github.com/nehu3n/nooh",
  },

  logo: {
    href: "/",
    text: "nooh",
  },

  navigation: {
    actions: [
      {
        href: "/changelog",
        label: "Changelog",
      },
    ],

    cta: {
      href: "https://github.com/nehu3n/nooh",
      label: "GitHub",
    },
    tabs: [
      {
        icon: "book-open",
        label: "Guides",
        path: "/getting-started",
      },
      {
        icon: "layers",
        label: "Core",
        path: "/core",
      },
      {
        icon: "terminal",
        label: "CLI",
        path: "/cli",
      },
      {
        icon: "cpu",
        label: "Compiler",
        path: "/compiler",
      },
      {
        icon: "plug",
        label: "Integrations",
        path: "/integrations",
      },
      {
        icon: "code",
        label: "Reference",
        path: "/reference",
      },
    ],
  },

  search: {
    provider: "orama",
  },

  theme: {
    mode: "system",
    radius: "md",
  },
  title: "Nooh",
});
