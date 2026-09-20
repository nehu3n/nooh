import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import {
  cancel,
  confirm,
  intro,
  isCancel,
  outro,
  select,
  spinner,
  text,
} from "@clack/prompts";

type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

interface ProjectOptions {
  directory: string;
  git: boolean;
  name: string;
  packageManager: PackageManager;
}

const exit = (message: string): never => {
  cancel(message);
  process.exit(1);
};

const run = (command: string, args: string[], cwd: string): void => {
  const result = spawnSync(command, args, {
    cwd,
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const packageManagerCommand = (packageManager: PackageManager): string => {
  if (packageManager === "pnpm") {
    return "pnpm";
  }

  if (packageManager === "npm") {
    return "npm";
  }

  if (packageManager === "yarn") {
    return "yarn";
  }

  return "bun";
};

const installCommand = (packageManager: PackageManager): [string, string[]] => {
  if (packageManager === "npm") {
    return ["npm", ["install"]];
  }

  if (packageManager === "yarn") {
    return ["yarn", ["install"]];
  }

  if (packageManager === "bun") {
    return ["bun", ["install"]];
  }

  return ["pnpm", ["install"]];
};

const detectPackageManager = (): PackageManager => {
  const userAgent = process.env.npm_config_user_agent ?? "";

  if (userAgent.startsWith("pnpm/")) {
    return "pnpm";
  }

  if (userAgent.startsWith("yarn/")) {
    return "yarn";
  }

  if (userAgent.startsWith("bun/")) {
    return "bun";
  }

  return "npm";
};

const packageJson = (name: string): string =>
  `${JSON.stringify(
    {
      dependencies: {
        "@hono/standard-validator": "latest",
        "@nooh-ts/nooh": "latest",
        hono: "latest",
      },
      devDependencies: {
        "@nooh-ts/cli": "latest",
        typescript: "latest",
      },
      engines: {
        node: ">=22",
      },
      name,
      private: true,
      scripts: {
        build: "nooh build",
        dev: "nooh dev",
        typecheck: "tsc --noEmit",
      },
      type: "module",
    },
    null,
    2
  )}\n`;

const files = (name: string): Record<string, string> => ({
  ".env.example": `# Add your environment variables here.
`,

  ".gitignore": `node_modules/
dist/
.nooh/
.env
.DS_Store
`,

  "nooh.config.ts": `import { config } from "@nooh-ts/nooh";

export interface App {
  Variables: {};
}

export default config<App>({
  routes: "src/routes",
});
`,

  "package.json": packageJson(name),

  "readme.md": `# ${name}

A [Nooh](https://github.com/nehu3n/nooh) application.

## Development

#### Install dependencies:

\`\`\`bash
${packageManagerCommand(detectPackageManager())} install
\`\`\`

#### Add a entrypoint

Modify \`src/index.ts\` to set an entry point, and modify the \`dev\` script to run the appropriate command to start the app.

#### Build application

\`\`\`bash
${packageManagerCommand(detectPackageManager())} build
\`\`\`

#### Start the development server:

\`\`\`bash
${packageManagerCommand(detectPackageManager())} dev
\`\`\`

## Routes

Routes are defined in \`src/routes/\` and compiled by Nooh into \`.nooh/\`.

The starter project includes:

\`\`\`text
GET /
\`\`\`

`,

  "src/index.ts": `// Nooh generates a standard Hono application.
// You can use any valid Hono entry point here:
// https://hono.dev/docs/getting-started/basic
import app from "../.nooh/app";
`,

  "src/middleware/.gitkeep": "",

  "src/routes/index.get.ts": `import { get } from "@router/index";

export default get((c) => c.text("hello world!"));
`,

  "tsconfig.json": `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "isolatedDeclarations": false,
    "strict": true,
    "skipLibCheck": true,
    "paths": {
      "@/*": ["./src/*"],
      "@router/*": ["./.nooh/router/*"]
    }
  },
  "include": [
    "src/**/*.ts",
    ".nooh/**/*.ts"
  ]
}
`,
});

const writeFiles = (root: string, entries: Record<string, string>): void => {
  for (const [relativePath, contents] of Object.entries(entries)) {
    const path = join(root, relativePath);

    mkdirSync(dirname(path), {
      recursive: true,
    });

    writeFileSync(path, contents, "utf8");
  }
};

const initializeGit = (root: string): void => {
  run("git", ["init"], root);
};

const PACKAGE_NAME_REGEX = /^[a-z0-9][a-z0-9._-]*$/i;

const main = async (): Promise<void> => {
  intro("create-nooh");

  const defaultName = process.argv[2] ?? "my-nooh-app";

  const projectName = await text({
    defaultValue: defaultName,
    message: "What should your project be called?",
    placeholder: defaultName,
    validate(value) {
      if (!value) {
        return "Project name is required.";
      }

      if (!PACKAGE_NAME_REGEX.test(value)) {
        return "Use a valid package name.";
      }
    },
  });

  if (isCancel(projectName)) {
    exit("Operation cancelled.");
  }

  const directory = resolve(process.cwd(), projectName.toString());

  if (existsSync(directory)) {
    const entries = readdirSync(directory);

    if (entries.length > 0) {
      const empty = await confirm({
        initialValue: false,
        message: `"${projectName.toString()}" already exists. Use it anyway?`,
      });

      if (isCancel(empty) || !empty) {
        exit("Choose another project directory.");
      }
    }
  }

  const defaultPackageManager = detectPackageManager();

  const packageManager = await select({
    initialValue: defaultPackageManager,
    message: "Which package manager do you want to use?",
    options: [
      {
        label: "pnpm",
        value: "pnpm" as const,
      },
      {
        label: "npm",
        value: "npm" as const,
      },
      {
        label: "Yarn",
        value: "yarn" as const,
      },
      {
        label: "Bun",
        value: "bun" as const,
      },
    ],
  });

  if (isCancel(packageManager)) {
    exit("Operation cancelled.");
  }

  const git = await confirm({
    initialValue: true,
    message: "Initialize a Git repository?",
  });

  if (isCancel(git)) {
    exit("Operation cancelled.");
  }

  const options: ProjectOptions = {
    directory,
    git: git as boolean,
    name: projectName.toString(),
    packageManager: packageManager as PackageManager,
  };

  const s = spinner();

  s.start("Creating your Nooh application");

  mkdirSync(options.directory, {
    recursive: true,
  });

  writeFiles(options.directory, files(options.name));

  if (options.git) {
    initializeGit(options.directory);
  }

  s.stop("Project created");

  const shouldInstall = await confirm({
    initialValue: true,
    message: "Install dependencies now?",
  });

  if (isCancel(shouldInstall)) {
    exit("Operation cancelled.");
  }

  if (shouldInstall) {
    const install = installCommand(options.packageManager);

    const installSpinner = spinner();

    installSpinner.start("Installing dependencies");

    const result = spawnSync(install[0], install[1], {
      cwd: options.directory,
      shell: process.platform === "win32",
      stdio: "inherit",
    });

    if (result.status !== 0) {
      installSpinner.stop("Dependency installation failed");

      outro(
        `Done! Your Nooh application is ready.

  cd ${options.name}
  ${packageManagerCommand(options.packageManager)} dev`
      );

      return;
    }

    installSpinner.stop("Dependencies installed");
  }

  outro(
    `Done! Your Nooh application is ready.

  cd ${options.name}
  ${packageManagerCommand(options.packageManager)} dev`
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
