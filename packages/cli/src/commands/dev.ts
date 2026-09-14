/** biome-ignore-all lint/complexity/noVoid: ... */
import { type ChildProcess, spawn } from "node:child_process";

import { runBuild } from "@/commands/build";

import { discoverProject } from "@/project";
import { ui } from "@/ui";
import { watch } from "@/watch";

const stopProcess = async (child: ChildProcess): Promise<void> => {
  if (child.exitCode !== null) {
    return;
  }

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      if (child.exitCode === null) {
        child.kill("SIGKILL");
      }

      resolve();
    }, 3000);

    child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });

    child.kill("SIGTERM");
  });
};

const parseDevArgs = (
  args: readonly string[]
): {
  readonly command: readonly string[];
  readonly config?: string;
} => {
  const separator = args.indexOf("--");

  const cliArgs = separator === -1 ? [...args] : args.slice(0, separator);

  const command = separator === -1 ? [] : args.slice(separator + 1);

  let config: string | undefined;

  for (let index = 0; index < cliArgs.length; index += 1) {
    const argument = cliArgs[index];

    if (argument === "--config" || argument === "-c") {
      const value = cliArgs[index + 1];

      if (!value) {
        throw new Error(`${argument} requires a config path.`);
      }

      config = value;
      index += 1;
      continue;
    }

    if (argument?.startsWith("--config=")) {
      const value = argument.slice("--config=".length);

      if (!value) {
        throw new Error("--config requires a config path.");
      }

      config = value;
      continue;
    }

    throw new Error(`unknown option "${argument}"`);
  }

  return {
    command,
    ...(config !== undefined && { config }),
  };
};

export const runDev = async (args: readonly string[]): Promise<void> => {
  const parsed = parseDevArgs(args);
  const command = [...parsed.command];

  if (command.length === 0) {
    ui.error("missing development command");

    console.error();
    console.error(
      `  ${ui.dim("usage:")} nooh dev [options] -- <command> [args...]`
    );
    console.error();
    console.error(
      `  ${ui.dim("example:")} nooh dev --config nooh.config.ts -- pnpm exec tsx src/index.ts`
    );

    process.exitCode = 1;
    return;
  }

  const project = await discoverProject(process.cwd(), parsed.config);

  ui.title("dev server");

  const parsedConfig = parsed.config ? { config: parsed.config } : undefined;
  const initialBuild = await runBuild(parsedConfig);

  if (!initialBuild.success) {
    process.exitCode = 1;
    return;
  }

  let child: ChildProcess | undefined;

  const start = (): void => {
    const [executable, ...commandArgs] = command;

    if (!executable) {
      return;
    }

    console.log(ui.info(`${executable} ${commandArgs.join(" ")}`));

    child = spawn(executable, commandArgs, {
      cwd: project.root,
      shell: false,
      stdio: "inherit",
    });

    child.once("error", (error) => {
      ui.error(`failed to start dev process: ${error.message}`);
    });
  };

  const restart = async (): Promise<void> => {
    if (child) {
      console.log(ui.changed("restarting dev server"));

      await stopProcess(child);
      child = undefined;
    }

    start();
  };

  const shutdown = async (): Promise<void> => {
    if (child) {
      await stopProcess(child);
      child = undefined;
    }

    process.exit(0);
  };

  process.once("SIGINT", () => {
    void shutdown();
  });

  process.once("SIGTERM", () => {
    void shutdown();
  });

  start();

  console.log();

  await watch({
    config: parsed.config,
    onBuild: async (success) => {
      if (!success) {
        return;
      }

      await restart();
    },
  });
};
