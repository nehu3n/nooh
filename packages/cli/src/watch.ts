/** biome-ignore-all lint/complexity/noVoid: ... */
import { type FSWatcher, watch as watchFs } from "node:fs";

import { runBuild } from "@/commands/build";
import { discoverProject } from "@/project";
import { ui } from "@/ui";

export interface WatchOptions {
  readonly config?: string | undefined;
  readonly onBuild?: ((success: boolean) => void | Promise<void>) | undefined;
}

export const watch = async (options: WatchOptions = {}): Promise<void> => {
  let project = await discoverProject(process.cwd(), options.config);

  let building = false;
  let pending = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  let routeWatcher: FSWatcher | undefined;
  let configWatcher: FSWatcher | undefined;

  const closeWatchers = (): void => {
    routeWatcher?.close();
    configWatcher?.close();

    routeWatcher = undefined;
    configWatcher = undefined;
  };

  const updateWatchers = async (): Promise<void> => {
    closeWatchers();

    project = await discoverProject(process.cwd(), options.config);

    routeWatcher = watchFs(
      project.routesRoot,
      {
        recursive: true,
      },
      (_event, filename) => {
        schedule(filename ?? undefined);
      }
    );

    configWatcher = watchFs(project.config, (_event, filename) => {
      schedule(filename ? filename.toString() : project.config);
    });
  };

  const rebuild = async (): Promise<void> => {
    if (building) {
      pending = true;
      return;
    }

    building = true;

    try {
      const buildOptions = options.config
        ? { config: options.config }
        : undefined;

      const result = await runBuild(buildOptions);

      await options.onBuild?.(result.success);

      if (result.success) {
        await updateWatchers();
      }
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

  const close = (): void => {
    closeWatchers();

    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  process.once("SIGINT", close);
  process.once("SIGTERM", close);

  ui.title(`watching ${project.routesRoot.replace(`${project.root}/`, "")}/`);

  await rebuild();

  console.log(ui.dim("  watching for changes..."));
};
