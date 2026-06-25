type RouteLike = {
  pathname: string;
  search: string;
  hash: string;
};

function splitRouteLike(path: string): RouteLike {
  const hashIndex = path.indexOf("#");
  const searchIndex = path.indexOf("?");
  const endOfPath = [hashIndex, searchIndex].filter((index) => index >= 0).sort((left, right) => left - right)[0] ?? path.length;

  const pathname = path.slice(0, endOfPath) || "/";
  const search = searchIndex >= 0 ? path.slice(searchIndex, hashIndex >= 0 ? hashIndex : path.length) : "";
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : "";

  return {pathname, search, hash};
}

function getCurrentRouteSegments(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  const pathname = window.location.pathname.replace(/\\/g, "/");
  const outIndex = pathname.toLowerCase().lastIndexOf("/out/");
  const relativePath = outIndex >= 0 ? pathname.slice(outIndex + 5) : pathname.replace(/^\/+/, "");
  const segments = relativePath.split("/").filter(Boolean);

  if (segments[segments.length - 1] === "index.html") {
    segments.pop();
  }

  return segments;
}

function formatRoutePath(pathname: string): string[] {
  if (pathname === "/") {
    return [];
  }

  return pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
}

function buildRelativeHref(pathname: string): string {
  const targetSegments = formatRoutePath(pathname);
  const currentSegments = getCurrentRouteSegments();

  let sharedPrefix = 0;
  while (sharedPrefix < currentSegments.length && sharedPrefix < targetSegments.length && currentSegments[sharedPrefix] === targetSegments[sharedPrefix]) {
    sharedPrefix += 1;
  }

  const upwardMoves = currentSegments.length - sharedPrefix;
  const relativeSegments = [...Array(upwardMoves).fill(".."), ...targetSegments.slice(sharedPrefix)];

  return relativeSegments.length > 0 ? relativeSegments.join("/") : ".";
}

export function toAppHref(path: string): string {
  if (typeof window === "undefined" || window.location.protocol !== "file:") {
    return path;
  }

  const {pathname, search, hash} = splitRouteLike(path);
  const relativePath = buildRelativeHref(pathname);
  const needsDirectorySlash = pathname === "/" || pathname.endsWith("/") || !pathname.includes(".");
  const formattedPath = needsDirectorySlash && relativePath !== "." ? `${relativePath}/` : relativePath;
  const rootPath = pathname === "/" && relativePath === "." ? "./" : formattedPath;

  return `${rootPath}${search}${hash}`;
}