import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  CANONICAL_STYLE_URL,
  COVERAGE_ZOOMS,
  DEMO_ENVELOPE,
  TILE_PAD,
} from "../../fixtures/basemap/demoArea.mjs";
import { enumerateTiles, tileKey } from "../../fixtures/basemap/enumerate.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..", "..");
const FIXTURE_PREFIX = "tests/fixtures/basemap";
const SITE_PREFIX = `${FIXTURE_PREFIX}/site`;
const MANIFEST_PATH = path.join(
  REPO_ROOT,
  `${FIXTURE_PREFIX}/site.manifest.json`,
);
const STYLE_PATH = path.join(REPO_ROOT, `${FIXTURE_PREFIX}/style.json`);

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
const style = JSON.parse(readFileSync(STYLE_PATH, "utf8"));

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Recursively list every file under a directory.
 *
 * @param {string} dir
 * @returns {string[]}
 */
function walkFiles(dir) {
  const files = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkFiles(absolute));
    } else {
      files.push(absolute);
    }
  }

  return files;
}

const ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> ' +
  '<a href="https://www.openmaptiles.org/" target="_blank">&copy; OpenMapTiles</a> ' +
  'Data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>';

describe("basemap manifest completeness", () => {
  it("records only stable provenance fields", () => {
    expect(Object.keys(manifest)).toEqual(["note", "style", "files", "absent"]);
    expect(Object.keys(manifest.style)).toEqual([
      "source",
      "path",
      "bytes",
      "sha256",
    ]);
    expect(Object.keys(manifest.files[0])).toEqual([
      "path",
      "source",
      "bytes",
      "sha256",
      "licence",
      "kind",
      "zoom",
    ]);
  });

  it("describes the canonical style and its rewritten assets", () => {
    expect(manifest.style.source).toBe(CANONICAL_STYLE_URL);
    expect(manifest.style.path).toBe(`${FIXTURE_PREFIX}/style.json`);
    expect(style.version).toBe(8);
    expect(style.glyphs).toBe(
      "/__basemap__/www.ogis.org/basemap/fonts/{fontstack}/{range}.pbf",
    );
    expect(style.sprite).toBe("/__basemap__/www.ogis.org/basemap/sprite");

    const source = style.sources.openmaptiles;
    expect(source.url).toBeUndefined();
    expect(source.tiles[0]).toMatch(
      /^\/__basemap__\/tiles\.openfreemap\.org\/planet\/[^/]+\/\{z\}\/\{x\}\/\{y\}\.pbf$/,
    );
    expect(source.minzoom).toBe(0);
    expect(source.maxzoom).toBe(14);

    expect(style.sources.attribution.attribution).toBe(ATTRIBUTION);
  });

  it("hashes the style file exactly", () => {
    const buffer = readFileSync(STYLE_PATH);
    expect(manifest.style.bytes).toBe(buffer.length);
    expect(manifest.style.sha256).toBe(sha256(buffer));
  });

  it("lists files in a stable, duplicate-free order", () => {
    const paths = manifest.files.map((file) => file.path);
    expect(paths).toEqual([...paths].sort());
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("records every on-disk site file, leaving no orphans", () => {
    const siteDir = path.join(REPO_ROOT, `${FIXTURE_PREFIX}/site`);
    const onDisk = new Set(
      walkFiles(siteDir).map((absolute) =>
        path.relative(REPO_ROOT, absolute).split(path.sep).join("/"),
      ),
    );
    const recorded = new Set(manifest.files.map((file) => file.path));

    expect([...onDisk].filter((file) => !recorded.has(file))).toEqual([]);
    expect([...recorded].filter((file) => !onDisk.has(file))).toEqual([]);
    expect(onDisk.size).toBe(recorded.size);
    expect(onDisk.size).toBe(2140);
  });

  it("verifies every listed file exists with the recorded bytes and hash", () => {
    for (const file of manifest.files) {
      const absolute = path.join(REPO_ROOT, file.path);

      expect(existsSync(absolute), `${file.path} is missing`).toBe(true);
      expect(statSync(absolute).size, `${file.path} size`).toBe(file.bytes);
      expect(sha256(readFileSync(absolute)), `${file.path} hash`).toBe(
        file.sha256,
      );
      expect(typeof file.source).toBe("string");
      expect(typeof file.licence).toBe("string");
      expect(file.licence.length).toBeGreaterThan(0);
      expect(["tile", "glyph", "sprite"]).toContain(file.kind);
    }
  });

  it("covers every enumerated tile exactly once", () => {
    const template = style.sources.openmaptiles.tiles[0].replace(
      "/__basemap__",
      "",
    );
    const expected = new Set(
      enumerateTiles(DEMO_ENVELOPE, {
        minZoom: COVERAGE_ZOOMS[0],
        maxZoom: COVERAGE_ZOOMS[COVERAGE_ZOOMS.length - 1],
        pad: TILE_PAD,
      }).map((tile) => {
        const localPath = template
          .replace("{z}", tile.z)
          .replace("{x}", tile.x)
          .replace("{y}", tile.y);
        return `${SITE_PREFIX}${localPath}`;
      }),
    );

    const recorded = new Set(
      manifest.files
        .filter((file) => file.kind === "tile")
        .map((file) => file.path),
    );

    expect(recorded.size).toBe(expected.size);
    expect(recorded).toEqual(expected);
    expect(recorded.size).toBe(2126);

    for (const tile of enumerateTiles(DEMO_ENVELOPE, {
      minZoom: COVERAGE_ZOOMS[0],
      maxZoom: COVERAGE_ZOOMS[COVERAGE_ZOOMS.length - 1],
      pad: TILE_PAD,
    })) {
      expect(tileKey(tile)).toMatch(/^\d+\/\d+\/\d+$/);
    }
  });

  it("vendors glyph range 0-255 for every declared fontstack", () => {
    const fontstacks = new Set();
    for (const layer of style.layers) {
      const fonts = layer.layout?.["text-font"];
      if (Array.isArray(fonts)) {
        fontstacks.add(fonts.join(","));
      }
    }

    const expected = new Set(
      [...fontstacks].map(
        (fontstack) =>
          `${SITE_PREFIX}/www.ogis.org/basemap/fonts/${fontstack}/0-255.pbf`,
      ),
    );
    const recorded = new Set(
      manifest.files
        .filter((file) => file.kind === "glyph")
        .map((file) => file.path),
    );

    expect(recorded).toEqual(expected);
    expect(recorded.size).toBe(12);
  });

  it("vendors the 1x sprite and no absent tiles", () => {
    const sprites = manifest.files
      .filter((file) => file.kind === "sprite")
      .map((file) => file.path);

    expect(sprites).toEqual([
      `${SITE_PREFIX}/www.ogis.org/basemap/sprite.json`,
      `${SITE_PREFIX}/www.ogis.org/basemap/sprite.png`,
    ]);
    expect(manifest.absent).toEqual([]);
  });
});
