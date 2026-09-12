export const normalizePath = (value: string): string => {
  const normalized = value.replaceAll("\\", "/");

  const parts = normalized.split("/");
  const result: string[] = [];

  for (const part of parts) {
    if (!part || part === ".") {
      continue;
    }

    if (part === "..") {
      result.pop();
      continue;
    }

    result.push(part);
  }

  return result.join("/");
};

const LEADING_SLASH_REGEX = /^\/+/;
export const stripLeadingSlash = (value: string): string =>
  value.replace(LEADING_SLASH_REGEX, "");

export const ensureLeadingSlash = (value: string): string => {
  if (!value) {
    return "/";
  }

  return value.startsWith("/") ? value : `/${value}`;
};

export const joinPath = (...parts: string[]): string =>
  normalizePath(parts.filter(Boolean).join("/"));

export const dirname = (value: string): string => {
  const normalized = normalizePath(value);
  const index = normalized.lastIndexOf("/");

  if (index === -1) {
    return "";
  }

  return normalized.slice(0, index);
};

export const basename = (value: string): string => {
  const normalized = normalizePath(value);
  const index = normalized.lastIndexOf("/");

  if (index === -1) {
    return normalized;
  }

  return normalized.slice(index + 1);
};

export const relativePath = (from: string, to: string): string => {
  const fromParts = normalizePath(from).split("/").filter(Boolean);
  const toParts = normalizePath(to).split("/").filter(Boolean);

  let common = 0;

  while (
    common < fromParts.length &&
    common < toParts.length &&
    fromParts[common] === toParts[common]
  ) {
    common += 1;
  }

  const result = [
    ...fromParts.slice(common).map(() => ".."),
    ...toParts.slice(common),
  ];

  return result.join("/");
};

export const relativeModuleSpecifier = (
  fromModule: string,
  toSource: string
): string => {
  const fromDirectory = dirname(fromModule);

  let target = normalizePath(toSource);

  if (target.endsWith(".ts")) {
    target = `${target.slice(0, -3)}.js`;
  } else if (target.endsWith(".tsx")) {
    target = `${target.slice(0, -4)}.js`;
  }

  const relative = relativePath(fromDirectory, target);

  return relative.startsWith(".") ? relative : `./${relative}`;
};

export const isPathInside = (file: string, root: string): boolean => {
  const normalizedFile = normalizePath(file);
  const normalizedRoot = normalizePath(root);

  if (normalizedFile === normalizedRoot) {
    return true;
  }

  return normalizedFile.startsWith(`${normalizedRoot}/`);
};

const EXTENSION_REGEX = /\.[^.]+$/;
export const removeExtension = (value: string): string =>
  value.replace(EXTENSION_REGEX, "");
