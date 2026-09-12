/** biome-ignore-all lint/complexity/noVoid: ... */
import { type ChildProcess, spawn } from "node:child_process";

import { runBuild } from "@/commands/build";

import { discoverProject } from "@/project";
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

export const runDev = async (args: readonly string[]): Promise<void> => {
  const command = [...args];

  if (command[0] === "--") {
    command.shift();
  }

  if (command.length === 0) {
    console.error("Usage: nooh dev -- <command> [args...]");

    process.exitCode = 1;
    return;
  }

  const project = await discoverProject();

  const initialBuild = await runBuild();

  if (!initialBuild) {
    process.exitCode = 1;
    return;
  }

  let child: ChildProcess | undefined;

  const start = (): void => {
    const [executable, ...commandArgs] = command;

    if (!executable) {
      return;
    }

    child = spawn(executable, commandArgs, {
      cwd: project.root,
      shell: false,
      stdio: "inherit",
    });

    child.once("error", (error) => {
      console.error(`Failed to start dev process: ${error.message}`);
    });
  };

  const restart = async (): Promise<void> => {
    if (child) {
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

  await watch({
    onBuild: async (success) => {
      if (!success) {
        return;
      }

      await restart();
    },
  });
};
