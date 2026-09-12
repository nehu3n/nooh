import { stat } from "node:fs/promises";
import { resolve } from "node:path";

const isFile = async (path: string): Promise<boolean> => {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
};

const resolveSource = async (path: string): Promise<string | null> => {
  const candidates = [
    `${path}.ts`,
    `${path}.tsx`,
    resolve(path, "index.ts"),
    resolve(path, "index.tsx"),
    path,
  ];

  for (const candidate of candidates) {
    // biome-ignore lint/performance/noAwaitInLoops: ...
    if (await isFile(candidate)) {
      return candidate;
    }
  }

  return null;
};

export const resolveNoohId = (
  root: string,
  id: string
): Promise<string | null> => {
  if (id.startsWith("@router/")) {
    const target = id.slice("@router/".length);

    return resolveSource(resolve(root, ".nooh", "router", target));
  }

  if (id.startsWith("@middleware/")) {
    const target = id.slice("@middleware/".length);

    return resolveSource(resolve(root, "src", "middleware", target));
  }

  return Promise.resolve(null);
};
