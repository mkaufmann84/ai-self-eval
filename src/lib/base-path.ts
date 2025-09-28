const RAW_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const NORMALIZED_BASE_PATH = RAW_BASE_PATH.replace(/\/$/, "");

export const appBasePath = NORMALIZED_BASE_PATH;

function ensureLeadingSlash(path: string) {
  if (!path) {
    return "/";
  }
  return path.startsWith("/") ? path : `/${path}`;
}

export function withBasePath(path: string): string {
  const target = ensureLeadingSlash(path);
  if (!appBasePath) {
    return target;
  }
  if (target === "/") {
    return appBasePath || "/";
  }
  return `${appBasePath}${target}`;
}

export function apiPath(path: string): string {
  return withBasePath(ensureLeadingSlash(path));
}
