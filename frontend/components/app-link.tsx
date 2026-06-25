"use client";

import NextLink from "next/link";
import {usePathname} from "next/navigation";
import {createElement, type ComponentProps} from "react";

type LinkProps = ComponentProps<typeof NextLink>;

function splitRouteLike(path: string) {
  const hashIndex = path.indexOf("#");
  const searchIndex = path.indexOf("?");
  const endOfPath = [hashIndex, searchIndex].filter((index) => index >= 0).sort((left, right) => left - right)[0] ?? path.length;

  return {
    pathname: path.slice(0, endOfPath) || "/",
    search: searchIndex >= 0 ? path.slice(searchIndex, hashIndex >= 0 ? hashIndex : path.length) : "",
    hash: hashIndex >= 0 ? path.slice(hashIndex) : ""
  };
}

function toSegments(pathname: string): string[] {
  if (pathname === "/") {
    return [];
  }

  return pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
}

function toRelativeHref(currentPathname: string, targetPath: string): string {
  const {pathname, search, hash} = splitRouteLike(targetPath);
  const currentSegments = toSegments(currentPathname);
  const targetSegments = toSegments(pathname);

  let sharedPrefix = 0;
  while (sharedPrefix < currentSegments.length && sharedPrefix < targetSegments.length && currentSegments[sharedPrefix] === targetSegments[sharedPrefix]) {
    sharedPrefix += 1;
  }

  const upwardMoves = currentSegments.length - sharedPrefix;
  const relativeSegments = [...Array(upwardMoves).fill(".."), ...targetSegments.slice(sharedPrefix)];
  const relativePath = relativeSegments.length > 0 ? relativeSegments.join("/") : ".";
  const needsDirectorySlash = pathname === "/" || pathname.endsWith("/") || !pathname.includes(".");
  const formattedPath = needsDirectorySlash && relativePath !== "." ? `${relativePath}/` : relativePath;
  const rootPath = pathname === "/" && relativePath === "." ? "./" : formattedPath;

  return `${rootPath}${search}${hash}`;
}

export function AppLink(props: LinkProps) {
  const pathname = usePathname();

  if (process.env.PLATFORM_TARGET === "static") {
    const {href, ...rest} = props;
    const resolvedHref = typeof href === "string" ? toRelativeHref(pathname, href) : href;

    return createElement("a", {...rest, href: resolvedHref});
  }

  return createElement(NextLink, props);
}