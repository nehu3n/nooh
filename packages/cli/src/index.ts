import { build } from "@/commands/build";

const main = async (): Promise<void> => {
  const command = process.argv[2] ?? "build";

  if (command === "build") {
    const success = await build();
    process.exitCode = success ? 0 : 1;
    return;
  }

  console.error(`Unknown command: ${command}`);
  process.exitCode = 1;
};

await main();
