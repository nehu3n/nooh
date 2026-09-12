import { build } from "@/commands/build";
import { runWatch } from "@/commands/watch";

const main = async (): Promise<void> => {
  const command = process.argv[2] ?? "build";

  switch (command) {
    case "build": {
      const success = await build();

      process.exitCode = success ? 0 : 1;
      return;
    }

    case "watch": {
      await runWatch();
      return;
    }

    default: {
      console.error(`Unknown command: ${command}`);
      process.exitCode = 1;
    }
  }
};

await main();
