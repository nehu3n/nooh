import { watch as watchFs } from "node:fs";

import { runBuild } from "@/commands/build";
import { discoverProject } from "@/project";

export interface WatchOptions {
  readonly onBuild?: (success: boolean) => void | Promise<void>;
}

const SOURCE_EXTENSIONS = [".ts", ".tsx"];

const hasSourceExtension = (path: string): boolean =>
  SOURCE_EXTENSIONS.some((extension) => path.endsWith(extension));

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
      const success = await runBuild();

      await options.onBuild?.(success);
    } finally {
      building = false;

      if (pending) {
        pending = false;
        await rebuild();
      }
    }
  };

  const schedule = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      timer = undefined;
      // biome-ignore lint/complexity/noVoid: ...
      void rebuild();
    }, 100);
  };

  const watcher = watchFs(
    `${project.root}/src`,
    { recursive: true },
    (_event, filename) => {
      if (filename === null || hasSourceExtension(filename.toString())) {
        schedule();
      }
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

  await rebuild();
};
