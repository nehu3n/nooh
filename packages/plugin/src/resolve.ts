import { access } from "node:fs/promises";
import { resolve } from "node:path";

const exists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const resolveSource = async (path: string): Promise<string | null> => {
  if (await exists(path)) {
    return path;
  }

  const ts = `${path}.ts`;

  if (await exists(ts)) {
    return ts;
  }

  const tsx = `${path}.tsx`;

  if (await exists(tsx)) {
    return tsx;
  }

  const index = resolve(path, "index.ts");

  if (await exists(index)) {
    return index;
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
