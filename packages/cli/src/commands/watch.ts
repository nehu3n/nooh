import { watch } from "@/watch";

export const runWatch = async (): Promise<void> => {
  await watch();
};
