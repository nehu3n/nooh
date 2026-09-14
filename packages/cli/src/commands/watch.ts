import { watch } from "@/watch";

export interface WatchCommandOptions {
  readonly config?: string;
}

export const runWatch = async (
  options: WatchCommandOptions = {}
): Promise<void> => {
  await watch(options);
};
