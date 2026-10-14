import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { COVERAGE_ZOOMS } from "../../fixtures/basemap/demoArea.mjs";
import { basemapMiddleware } from "../../fixtures/basemap/vitePlugin.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..", "..");
const FIXTURE_PREFIX = "tests/fixtures/basemap";

const manifest = JSON.parse(
  readFileSync(
    path.join(REPO_ROOT, `${FIXTURE_PREFIX}/site.manifest.json`),
    "utf8",
  ),
);

/**
 * @param {string} repoPath - path relative to the repo root (with the
 *   tests/fixtures/basemap/site prefix)
 * @returns {string} the middleware request URL
 */
function toUrl(repoPath) {
  return `/__basemap__${repoPath.slice(`${FIXTURE_PREFIX}/site`.length)}`;
}

const tile = manifest.files.find((file) => file.kind === "tile");
const glyph = manifest.files.find((file) => file.kind === "glyph");
const spriteJson = manifest.files.find(
  (file) => file.kind === "sprite" && file.path.endsWith(".json"),
);
const spritePng = manifest.files.find(
  (file) => file.kind === "sprite" && file.path.endsWith(".png"),
);

const maxZoom = COVERAGE_ZOOMS[COVERAGE_ZOOMS.length - 1];
const maxZoomTile = manifest.files.find(
  (file) =>
    file.kind === "tile" &&
    new RegExp(`/${maxZoom}/\\d+/\\d+\\.pbf$`).test(file.path),
);

// At the maximum zoom the envelope's columns never start at 0, so this tile is
// inside the pyramid but outside the vendored set.
const missingTileUrl = toUrl(
  maxZoomTile.path.replace(/\/\d+\/\d+\.pbf$/, "/0/0.pbf"),
);
const missingGlyphUrl = toUrl(glyph.path.replace(/0-255\.pbf$/, "256-511.pbf"));
const missingSpriteUrl = toUrl(
  spritePng.path.replace(/\.png$/, "-missing.png"),
);

/**
 * Invoke the middleware directly with a minimal request/response shim.
 *
 * @param {string} url
 * @param {{ method?: string }} [options]
 * @returns {Promise<{ status: number | null, headers: Record<string, string>, body: Buffer | null, next: boolean }>}
 */
function call(url, options = {}) {
  const method = options.method ?? "GET";

  return new Promise((resolve) => {
    /** @type {Record<string, string>} */
    const headers = {};
    const response = {
      statusCode: 200,
      setHeader(name, value) {
        headers[name.toLowerCase()] = value;
      },
      end(body) {
        resolve({
          status: response.statusCode,
          headers,
          body: body === undefined ? null : Buffer.from(body),
          next: false,
        });
      },
    };

    basemapMiddleware({ method, url }, response, () =>
      resolve({ status: null, headers, body: null, next: true }),
    );
  });
}

describe("basemap vite plugin middleware", () => {
  it("serves a vendored tile as protobuf", async () => {
    const result = await call(toUrl(tile.path));

    expect(result.status).toBe(200);
    expect(result.headers["content-type"]).toBe("application/x-protobuf");
    expect(result.body.length).toBe(tile.bytes);
  });

  it("serves a vendored glyph as protobuf", async () => {
    const result = await call(toUrl(glyph.path));

    expect(result.status).toBe(200);
    expect(result.headers["content-type"]).toBe("application/x-protobuf");
    expect(result.body.length).toBe(glyph.bytes);
  });

  it("serves a missing tile as an instant empty 200 protobuf", async () => {
    const result = await call(missingTileUrl);

    expect(result.status).toBe(200);
    expect(result.headers["content-type"]).toBe("application/x-protobuf");
    expect(result.body.length).toBe(0);
  });

  it("serves a missing glyph as an instant empty 200 protobuf", async () => {
    const result = await call(missingGlyphUrl);

    expect(result.status).toBe(200);
    expect(result.headers["content-type"]).toBe("application/x-protobuf");
    expect(result.body.length).toBe(0);
  });

  it("returns a loud 404 for a missing sprite", async () => {
    const result = await call(missingSpriteUrl);

    expect(result.status).toBe(404);
    expect(result.headers["content-type"]).toContain("text/plain");
    expect(result.body.toString()).toContain("not found");
  });

  it("serves JSON, protobuf and PNG with the correct content types", async () => {
    expect((await call(toUrl(spriteJson.path))).headers["content-type"]).toBe(
      "application/json; charset=utf-8",
    );
    expect((await call(toUrl(tile.path))).headers["content-type"]).toBe(
      "application/x-protobuf",
    );
    expect((await call(toUrl(spritePng.path))).headers["content-type"]).toBe(
      "image/png",
    );
  });

  it("sets permissive CORS on served and 404 responses", async () => {
    expect(
      (await call(toUrl(tile.path))).headers["access-control-allow-origin"],
    ).toBe("*");
    expect(
      (await call(missingSpriteUrl)).headers["access-control-allow-origin"],
    ).toBe("*");
  });

  it("answers OPTIONS with 204 and no body", async () => {
    const result = await call(toUrl(spritePng.path), { method: "OPTIONS" });

    expect(result.status).toBe(204);
    expect(result.body).toBeNull();
    expect(result.headers["access-control-allow-origin"]).toBe("*");
  });

  it("rejects malformed and empty paths with 400", async () => {
    expect((await call("/__basemap__/%E0%A4%A")).status).toBe(400);
    expect((await call("/__basemap__/")).status).toBe(400);
  });

  it("rejects path traversal with 400", async () => {
    const result = await call("/__basemap__/../../package.json");

    expect(result.status).toBe(400);
    expect(result.body.toString()).toContain("Malformed");
  });

  it("delegates non-GET/HEAD methods to the next middleware", async () => {
    const result = await call(toUrl(tile.path), { method: "POST" });

    expect(result.next).toBe(true);
  });
});
