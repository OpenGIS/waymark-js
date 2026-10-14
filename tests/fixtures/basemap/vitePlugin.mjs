/**
 * Vite middleware serving the vendored basemap assets.
 *
 * Assets under `tests/fixtures/basemap/site/` are served at
 * `/__basemap__/<host>/<path>`. The canonical style is served separately by the
 * existing `publicDir` mapping at `/basemap/style.json`.
 *
 * Policy, matching the determinism design:
 *   - a missing tile or glyph (`.pbf`) returns an instant empty 200 with the
 *     protobuf content type, so MapLibre sees an empty tile and raises no
 *     console error;
 *   - a missing sprite file returns a loud 404, so a broken symbol set cannot
 *     pass silently;
 *   - responses carry permissive CORS.
 *
 * No ports or absolute origins are baked in: the middleware is served by
 * whatever dev server loads the plugin.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { SITE_PREFIX } from "./demoArea.mjs";

const SITE_DIR = path.join(import.meta.dirname, "site");

const CONTENT_TYPES = {
  ".pbf": "application/x-protobuf",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

/**
 * @param {import("node:http").ServerResponse} response
 * @param {number} status
 * @param {string} contentType
 * @param {Buffer | string} body
 */
function send(response, status, contentType, body) {
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(body);

  response.statusCode = status;
  response.setHeader("Content-Type", contentType);
  response.setHeader("Content-Length", payload.length);
  for (const [header, value] of Object.entries(CORS_HEADERS)) {
    response.setHeader(header, value);
  }
  response.end(payload);
}

/**
 * Connect-style middleware serving vendored basemap assets.
 *
 * Exported so the serving contract can be pinned by unit tests; `basemapPlugin`
 * is the only production caller.
 *
 * @param {import("node:http").IncomingMessage} request
 * @param {import("node:http").ServerResponse} response
 * @param {() => void} next
 */
export function basemapMiddleware(request, response, next) {
  const method = request.method ?? "GET";

  if (method === "OPTIONS") {
    response.statusCode = 204;
    for (const [header, value] of Object.entries(CORS_HEADERS)) {
      response.setHeader(header, value);
    }
    response.end();
    return;
  }

  if (method !== "GET" && method !== "HEAD") {
    next();
    return;
  }

  let pathname = (request.url ?? "").split("?")[0];

  if (pathname.startsWith(SITE_PREFIX)) {
    pathname = pathname.slice(SITE_PREFIX.length);
  }

  let relative;
  try {
    relative = decodeURIComponent(pathname).replace(/^\/+/, "");
  } catch {
    send(response, 400, "text/plain; charset=utf-8", "Malformed asset path\n");
    return;
  }

  const segments = relative.split("/");

  if (relative.length === 0 || segments.includes("..")) {
    send(response, 400, "text/plain; charset=utf-8", "Malformed asset path\n");
    return;
  }

  const absolute = path.join(SITE_DIR, relative);
  const contentType =
    CONTENT_TYPES[path.extname(absolute).toLowerCase()] ??
    "application/octet-stream";

  if (existsSync(absolute) && statSync(absolute).isFile()) {
    send(response, 200, contentType, readFileSync(absolute));
    return;
  }

  // Missing tiles and glyphs are expected: the fixture vendors a bounded
  // envelope, and MapLibre may request edge tiles or glyph ranges it does not
  // need. An empty 200 keeps the console clean.
  if (path.extname(absolute).toLowerCase() === ".pbf") {
    send(response, 200, contentType, Buffer.alloc(0));
    return;
  }

  // A missing sprite is a genuine fault: fail loudly.
  send(
    response,
    404,
    "text/plain; charset=utf-8",
    `Basemap fixture asset not found: ${relative}\n`,
  );
}

/**
 * @returns {import("vite").Plugin}
 */
export function basemapPlugin() {
  return {
    name: "waymark-basemap-fixtures",
    configureServer(server) {
      server.middlewares.use(SITE_PREFIX, (request, response, next) => {
        basemapMiddleware(request, response, next);
      });
    },
  };
}
