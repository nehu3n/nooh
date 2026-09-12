/** biome-ignore-all lint/complexity/noVoid: ... */
import { watch as watchFs } from "node:fs";

import { runBuild } from "@/commands/build";
import { discoverProject } from "@/project";
import { ui } from "@/ui";

export interface WatchOptions {
  readonly onBuild?: (success: boolean) => void | Promise<void>;
}

export const watch = async (options: WatchOptions = {}): Promise<void> => {
  const project = await discoverProject();

  let building = false;
  let pending = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const rebuild = async (): Promise<void> => {
    if (building) {
      pending = true;
      return;
    }

    building = true;

    try {
      const result = await runBuild();

      await options.onBuild?.(result.success);
    } finally {
      building = false;

      if (pending) {
        pending = false;

        void rebuild();
      }
    }
  };

  const schedule = (filename?: string | Buffer): void => {
    if (timer !== undefined) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      timer = undefined;

      if (filename !== undefined) {
        console.log(
          `${ui.dim(ui.timestamp())} ${ui.changed(
            `changed ${filename.toString()}`
          )}`
        );
      }

      void rebuild();
    }, 100);
  };

  const watcher = watchFs(
    `${project.root}/src`,
    {
      recursive: true,
    },
    (_event, filename) => {
      schedule(filename ?? undefined);
    }
  );

  const close = (): void => {
    watcher.close();

    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  process.once("SIGINT", close);
  process.once("SIGTERM", close);

  ui.title("watching src/");

  await rebuild();

  console.log(ui.dim("  watching for changes..."));
};
