import { defineConfig } from "blume";

export default defineConfig({
  content: {
    pages: "src",
    root: "docs",
  },
  description:
    "A dependency-free, compile-time metaframework for building type-safe file-based Hono APIs.",

  github: {
    owner: "nehu3n",
    repo: "https://github.com/nehu3n/nooh",
  },

  logo: {
    href: "/icon.ico",
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
    tabs: [],
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
