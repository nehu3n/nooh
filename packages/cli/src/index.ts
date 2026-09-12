import { runBuild } from "@/commands/build";
import { runDev } from "@/commands/dev";
import { runWatch } from "@/commands/watch";

import { ui } from "@/ui";

const printHelp = (): void => {
  console.log();
  console.log(`${ui.brand()} ${ui.bold("backend compiler for Hono")}`);
  console.log();

  console.log(`${ui.bold("Commands")}`);

  console.log(`  ${ui.cyan("build")}    compile the project`);

  console.log(`  ${ui.cyan("watch")}    compile and watch for changes`);

  console.log(`  ${ui.cyan("dev")}      compile, watch and run a process`);

  console.log();

  console.log(`${ui.bold("Examples")}`);

  console.log(`  ${ui.dim("nooh build")}`);

  console.log(`  ${ui.dim("nooh watch")}`);

  console.log(`  ${ui.dim("nooh dev -- pnpm exec tsx src/index.ts")}`);

  console.log();
};

const main = async (): Promise<void> => {
  const command = process.argv[2] ?? "build";

  if (command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "--version" || command === "-v") {
    console.log("0.0.0");
    return;
  }

  switch (command) {
    case "build": {
      const result = await runBuild();

      process.exitCode = result.success ? 0 : 1;

      return;
    }

    case "watch": {
      await runWatch();
      return;
    }

    case "dev": {
      await runDev(process.argv.slice(3));
      return;
    }

    default: {
      ui.error(`unknown command "${command}"`);

      console.error();
      printHelp();

      process.exitCode = 1;
    }
  }
};

await main();
