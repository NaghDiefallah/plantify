import {createServer} from "node:http";
import {readFile, stat} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "..");
const staticRoot = path.join(appRoot, "out");
const port = Number(process.env.PORT || process.env.npm_config_port || process.argv[2] || process.argv[3] || 3000);

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "application/javascript; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".ico", "image/x-icon"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"]
]);

function getContentType(filePath) {
  return contentTypes.get(path.extname(filePath).toLowerCase()) ?? "application/octet-stream";
}

function safeJoin(root, requestPath) {
  const normalized = path.normalize(requestPath).replace(/^([.]{2}[\\/])+/, "");
  const resolved = path.resolve(root, `.${path.sep}${normalized}`);
  if (!resolved.startsWith(root)) {
    return null;
  }
  return resolved;
}

async function resolveAsset(requestPath) {
  const decoded = decodeURIComponent(requestPath.split("?")[0] || "/");
  const pathname = decoded === "/" ? "/index.html" : decoded;
  const candidates = [];

  if (pathname.endsWith("/")) {
    candidates.push(pathname + "index.html");
  }

  candidates.push(pathname);

  if (!path.extname(pathname)) {
    candidates.push(`${pathname}.html`);
    candidates.push(path.join(pathname, "index.html"));
  }

  for (const candidate of candidates) {
    const filePath = safeJoin(staticRoot, candidate);
    if (!filePath) {
      continue;
    }

    try {
      const stats = await stat(filePath);
      if (stats.isFile()) {
        return {filePath, statusCode: 200};
      }
      if (stats.isDirectory()) {
        const indexPath = path.join(filePath, "index.html");
        const indexStats = await stat(indexPath);
        if (indexStats.isFile()) {
          return {filePath: indexPath, statusCode: 200};
        }
      }
    } catch {
      // Try the next candidate.
    }
  }

  const notFoundPath = path.join(staticRoot, "404.html");
  try {
    const notFoundStats = await stat(notFoundPath);
    if (notFoundStats.isFile()) {
      return {filePath: notFoundPath, statusCode: 404};
    }
  } catch {
    // Fall through to a plain text response.
  }

  return {filePath: null, statusCode: 404};
}

const server = createServer(async (request, response) => {
  if (!request.url) {
    response.statusCode = 400;
    response.end("Bad Request");
    return;
  }

  const asset = await resolveAsset(request.url);
  if (!asset.filePath) {
    response.statusCode = 404;
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.end("Not Found");
    return;
  }

  response.statusCode = asset.statusCode;
  response.setHeader("Content-Type", getContentType(asset.filePath));
  response.setHeader("Cache-Control", asset.filePath.endsWith(".html") ? "no-cache" : "public, max-age=31536000, immutable");
  response.end(await readFile(asset.filePath));
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Static frontend server listening on http://0.0.0.0:${port}`);
});