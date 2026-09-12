import { runBuild } from "@/commands/build";
import { runDev } from "@/commands/dev";
import { runWatch } from "@/commands/watch";

const main = async (): Promise<void> => {
  const command = process.argv[2] ?? "build";

  switch (command) {
    case "build": {
      const success = await runBuild();

      process.exitCode = success ? 0 : 1;
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
      console.error(`Unknown command: ${command}`);
      process.exitCode = 1;
    }
  }
};

await main();
