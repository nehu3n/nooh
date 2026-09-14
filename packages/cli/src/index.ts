import { runBuild } from "@/commands/build";
import { runDev } from "@/commands/dev";
import { runWatch } from "@/commands/watch";

import { ui } from "@/ui";

const printHelp = (): void => {
  console.log();
  console.log(`${ui.brand()} ${ui.bold("backend compiler for Hono")}`);
  console.log();

  console.log(`${ui.bold("Usage")}`);

  console.log(`  ${ui.dim("nooh build")} [options]`);

  console.log(`  ${ui.dim("nooh watch")} [options]`);

  console.log(`  ${ui.dim("nooh dev")} [options] -- <command> [args...]`);

  console.log();

  console.log(`${ui.bold("Options")}`);

  console.log(
    `  ${ui.cyan("-c, --config")} ${ui.dim(
      "<path>"
    )}    use a custom Nooh config`
  );

  console.log();

  console.log(`${ui.bold("Config resolution")}`);

  console.log(`  ${ui.dim("1.")} nooh.config.ts`);

  console.log(`  ${ui.dim("2.")} src/nooh.config.ts`);

  console.log(`  ${ui.dim("3.")} src/config.ts`);

  console.log();

  console.log(`${ui.bold("Examples")}`);

  console.log(`  ${ui.dim("nooh build")}`);

  console.log(`  ${ui.dim("nooh build --config nooh.config.ts")}`);

  console.log(`  ${ui.dim("nooh watch --config src/nooh.config.ts")}`);

  console.log(
    `  ${ui.dim(
      "nooh dev --config nooh.config.ts -- pnpm exec tsx src/index.ts"
    )}`
  );

  console.log();
};

interface ParsedCommand {
  readonly args: readonly string[];
  readonly config?: string;
}

const parseOptions = (args: readonly string[]): ParsedCommand => {
  const remaining: string[] = [];
  let config: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (!argument) {
      continue;
    }

    if (argument === "--config" || argument === "-c") {
      const value = args[index + 1];

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

    remaining.push(argument);
  }

  return {
    args: remaining,
    ...(config !== undefined && { config }),
  };
};

const main = async (): Promise<void> => {
  const command = process.argv[2] ?? "build";

  if (command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "--version" || command === "-v") {
    console.log("0.1.0");
    return;
  }

  try {
    switch (command) {
      case "build": {
        const parsed = parseOptions(process.argv.slice(3));

        if (parsed.args.length > 0) {
          throw new Error(`unknown argument "${parsed.args[0]}"`);
        }

        const parsedConfig = parsed.config
          ? { config: parsed.config }
          : undefined;

        const result = await runBuild(parsedConfig);

        process.exitCode = result.success ? 0 : 1;

        return;
      }

      case "watch": {
        const parsed = parseOptions(process.argv.slice(3));

        if (parsed.args.length > 0) {
          throw new Error(`unknown argument "${parsed.args[0]}"`);
        }

        const parsedConfig = parsed.config
          ? { config: parsed.config }
          : undefined;

        await runWatch(parsedConfig);

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
  } catch (error) {
    ui.error(error instanceof Error ? error.message : "Unknown error.");

    process.exitCode = 1;
  }
};

await main();
