/**
 * Deterministic basemap fixture generator.
 *
 * Run with `npm run fixtures:refresh`. Fetches the live OpenGIS "Basemap"
 * style, validates every asset host against the committable allow-list,
 * rewrites asset URLs to root-relative local form, resolves the vector
 * TileJSON inline, and vendors the tile envelope, glyph range 0-255 and the 1x
 * sprite into `tests/fixtures/basemap/`.
 *
 * The run is all-or-nothing: every asset is fetched into memory before a single
 * byte is written, so a failure never lands a partial fixture set. Output is
 * byte-identical across consecutive runs (no timestamps, stable key order).
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  rmdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  ASSET_LICENCES,
  CANONICAL_STYLE_URL,
  COMMITTABLE_HOSTS,
  COVERAGE_ZOOMS,
  DEMO_ENVELOPE,
  EXCLUDED_HOSTS,
  SITE_PREFIX,
  TILE_PAD,
} from "./demoArea.mjs";
import { enumerateTiles } from "./enumerate.mjs";

const FIXTURE_DIR = import.meta.dirname;
const REPO_ROOT = path.resolve(FIXTURE_DIR, "..", "..", "..");
const SITE_DIR = path.join(FIXTURE_DIR, "site");
const STYLE_PATH = path.join(FIXTURE_DIR, "style.json");
const MANIFEST_PATH = path.join(FIXTURE_DIR, "site.manifest.json");

// Repo-growth guard: the envelope is explicit, not exhaustive, so a runaway
// viewport derivation should abort rather than vendor an unbounded tree. The
// derived demo area enumerates ~2.1k tiles.
const MAX_TILE_COUNT = 5000;

// Bounded fetch concurrency; keeps the generator quick without hammering the
// upstream hosts.
const FETCH_CONCURRENCY = 24;

/**
 * Error raised when an asset URL points at a host that may not be vendored.
 */
export class HostPolicyError extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
    this.name = "HostPolicyError";
  }
}

/**
 * Split an absolute http(s) URL into host and raw path, preserving `{...}`
 * template braces that the WHATWG URL parser would escape.
 *
 * @param {string} url
 * @returns {{ host: string, urlPath: string }}
 */
function splitUrl(url) {
  const match = /^https?:\/\/([^/]+)(\/.*)?$/.exec(url);

  if (!match) {
    throw new HostPolicyError(`Unsupported asset URL: ${url}`);
  }

  return { host: match[1], urlPath: match[2] ?? "/" };
}

/**
 * @param {string} host
 * @returns {boolean}
 */
export function isCommittableHost(host) {
  return COMMITTABLE_HOSTS.includes(host);
}

/**
 * Assert an asset URL resolves to a committable host. Throws otherwise: the
 * generator aborts rather than invent a policy for an unknown host.
 *
 * @param {string} url
 * @param {string} [context]
 */
export function assertCommittableUrl(url, context = "") {
  const { host } = splitUrl(url);
  const suffix = context ? ` (${context})` : "";

  if (EXCLUDED_HOSTS.some((excluded) => host.endsWith(excluded))) {
    throw new HostPolicyError(
      `Excluded host "${host}" for ${url}${suffix}: the legacy *.github.io host ` +
        `301-redirects and breaks CORS and must never be used`,
    );
  }

  if (!isCommittableHost(host)) {
    throw new HostPolicyError(
      `Non-committable host "${host}" for ${url}${suffix}: ` +
        `expected one of ${COMMITTABLE_HOSTS.join(", ")}`,
    );
  }
}

/**
 * Assert every host referenced by a style (sources, glyphs, sprite) is
 * committable, without fetching anything. The TileJSON-resolved tile host is
 * asserted during resolution.
 *
 * @param {object} style
 */
export function assertStyleHosts(style) {
  for (const [id, source] of Object.entries(style.sources ?? {})) {
    if (typeof source.url === "string") {
      assertCommittableUrl(source.url, `source "${id}"`);
    }
    for (const tile of source.tiles ?? []) {
      assertCommittableUrl(tile, `source "${id}"`);
    }
    if (typeof source.data === "string" && /^https?:/.test(source.data)) {
      assertCommittableUrl(source.data, `source "${id}"`);
    }
  }

  if (typeof style.glyphs === "string") {
    assertCommittableUrl(style.glyphs, "glyphs");
  }

  const sprites = Array.isArray(style.sprite)
    ? style.sprite.map((sprite) => sprite.url)
    : [style.sprite];

  for (const sprite of sprites) {
    if (typeof sprite === "string") {
      assertCommittableUrl(sprite, "sprite");
    }
  }
}

/**
 * @param {string} url
 * @returns {string}
 */
function toLocalUrl(url) {
  const { host, urlPath } = splitUrl(url);
  return `${SITE_PREFIX}/${host}${urlPath}`;
}

/**
 * @param {string} absolutePath
 * @returns {string}
 */
function repoRelative(absolutePath) {
  return path.relative(REPO_ROOT, absolutePath).split(path.sep).join("/");
}

/**
 * @param {Uint8Array} buffer
 * @returns {string}
 */
function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * @param {string} url
 * @returns {Promise<{ status: number, buffer: Buffer | null }>}
 */
async function fetchBuffer(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "waymark-js fixture generator" },
  });

  if (response.status !== 200) {
    return { status: response.status, buffer: null };
  }

  return {
    status: response.status,
    buffer: Buffer.from(await response.arrayBuffer()),
  };
}

/**
 * Run `worker` over `items` with bounded concurrency, preserving order.
 *
 * @template T, R
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T) => Promise<R>} worker
 * @returns {Promise<R[]>}
 */
async function pool(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;

  async function run() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => run()),
  );

  return results;
}

/**
 * Unique, sorted glyph fontstacks declared across the style's layers.
 *
 * @param {object} style
 * @returns {string[]}
 */
function collectFontstacks(style) {
  const fontstacks = new Set();

  for (const layer of style.layers ?? []) {
    const fonts = layer.layout?.["text-font"];

    if (
      Array.isArray(fonts) &&
      fonts.every((font) => typeof font === "string")
    ) {
      fontstacks.add(fonts.join(","));
    }
  }

  return [...fontstacks].sort();
}

/**
 * Recursively list every file under a directory.
 *
 * @param {string} dir
 * @returns {string[]}
 */
function walkFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }

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

/**
 * @param {string} dir
 */
function removeEmptyDirs(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const absolute = path.join(dir, entry.name);
    removeEmptyDirs(absolute);

    if (readdirSync(absolute).length === 0) {
      rmdirSync(absolute);
    }
  }
}

/**
 * Validate the style, vendor every asset, then write the canonical style and
 * the manifest.
 */
async function run() {
  const styleUrl = process.env.BASEMAP_STYLE_URL ?? CANONICAL_STYLE_URL;

  const styleResponse = await fetch(styleUrl, {
    headers: { "user-agent": "waymark-js fixture generator" },
  });

  if (styleResponse.status !== 200) {
    throw new Error(
      `Failed to fetch style ${styleUrl}: HTTP ${styleResponse.status}`,
    );
  }

  const style = await styleResponse.json();

  if (style.version !== 8) {
    throw new Error(`Unsupported style version: ${style.version}`);
  }

  assertStyleHosts(style);

  // --- Resolve sources: inline vector TileJSON, rewrite asset URLs. --------
  /** @type {string[]} */
  const tileTemplates = [];

  for (const [id, source] of Object.entries(style.sources ?? {})) {
    if (typeof source.url === "string") {
      const tilejsonResponse = await fetch(source.url, {
        headers: { "user-agent": "waymark-js fixture generator" },
      });

      if (tilejsonResponse.status !== 200) {
        throw new Error(
          `Failed to fetch TileJSON for source "${id}": HTTP ${tilejsonResponse.status}`,
        );
      }

      const tilejson = await tilejsonResponse.json();
      const tiles = Array.isArray(tilejson.tiles) ? tilejson.tiles : [];

      if (tiles.length === 0) {
        throw new Error(
          `TileJSON for source "${id}" declares no tile templates`,
        );
      }

      for (const tile of tiles) {
        assertCommittableUrl(tile, `source "${id}" tile template`);
      }

      tileTemplates.push(...tiles);
      source.tiles = tiles.map(toLocalUrl);

      if (typeof tilejson.minzoom === "number") {
        source.minzoom = tilejson.minzoom;
      }
      if (typeof tilejson.maxzoom === "number") {
        source.maxzoom = tilejson.maxzoom;
      }

      // An inlined source fetches no descriptor, so carry the TileJSON's
      // attribution (verbatim HTML) onto the source itself: MapLibre's
      // AttributionControl reads `source.attribution` from used tile managers,
      // and the descriptor's value never reaches the map otherwise.
      if (
        typeof tilejson.attribution === "string" &&
        tilejson.attribution.length > 0
      ) {
        source.attribution = tilejson.attribution;
      }

      delete source.url;
    } else if (Array.isArray(source.tiles)) {
      for (const tile of source.tiles) {
        assertCommittableUrl(tile, `source "${id}" tile template`);
      }
      tileTemplates.push(...source.tiles);
      source.tiles = source.tiles.map(toLocalUrl);
    }
  }

  // --- Rewrite glyph and sprite URLs. -------------------------------------
  const glyphsTemplate = typeof style.glyphs === "string" ? style.glyphs : null;
  if (glyphsTemplate) {
    style.glyphs = toLocalUrl(glyphsTemplate);
  }

  const spriteTemplate = typeof style.sprite === "string" ? style.sprite : null;
  if (spriteTemplate) {
    style.sprite = toLocalUrl(spriteTemplate);
  }

  // --- Enumerate tiles and build the fetch jobs. --------------------------
  const tiles = enumerateTiles(DEMO_ENVELOPE, {
    minZoom: COVERAGE_ZOOMS[0],
    maxZoom: COVERAGE_ZOOMS[COVERAGE_ZOOMS.length - 1],
    pad: TILE_PAD,
  });

  if (tiles.length > MAX_TILE_COUNT) {
    throw new Error(
      `Refusing to vendor ${tiles.length} tiles (max ${MAX_TILE_COUNT}); ` +
        `check the derived envelope in demoArea.mjs`,
    );
  }

  /**
   * @type {Array<{ sourceUrl: string, repoPath: string, kind: string, licence: string, zoom: number | null }>}
   */
  const jobs = [];

  for (const template of tileTemplates) {
    for (const tile of tiles) {
      const sourceUrl = template
        .replace("{z}", tile.z)
        .replace("{x}", tile.x)
        .replace("{y}", tile.y);
      const { host, urlPath } = splitUrl(sourceUrl);

      jobs.push({
        sourceUrl,
        repoPath: repoRelative(path.join(SITE_DIR, host, urlPath)),
        kind: "tile",
        licence: ASSET_LICENCES.tile,
        zoom: tile.z,
      });
    }
  }

  if (glyphsTemplate) {
    for (const fontstack of collectFontstacks(style)) {
      const sourceUrl = glyphsTemplate
        .replace("{fontstack}", fontstack)
        .replace("{range}", "0-255");
      const { host, urlPath } = splitUrl(sourceUrl);

      jobs.push({
        sourceUrl,
        repoPath: repoRelative(path.join(SITE_DIR, host, urlPath)),
        kind: "glyph",
        licence: ASSET_LICENCES.glyph,
        zoom: null,
      });
    }
  }

  if (spriteTemplate) {
    for (const extension of ["json", "png"]) {
      const sourceUrl = `${spriteTemplate}.${extension}`;
      const { host, urlPath } = splitUrl(sourceUrl);

      jobs.push({
        sourceUrl,
        repoPath: repoRelative(path.join(SITE_DIR, host, urlPath)),
        kind: "sprite",
        licence: ASSET_LICENCES.sprite,
        zoom: null,
      });
    }
  }

  // --- Fetch everything into memory before writing anything. --------------
  const fetched = await pool(jobs, FETCH_CONCURRENCY, async (job) => ({
    job,
    ...(await fetchBuffer(job.sourceUrl)),
  }));

  const files = [];
  const absent = [];

  for (const { job, status, buffer } of fetched) {
    if (buffer === null) {
      if (status !== 404) {
        throw new Error(`Failed to fetch ${job.sourceUrl}: HTTP ${status}`);
      }

      absent.push({
        path: job.repoPath,
        source: job.sourceUrl,
        status,
        kind: job.kind,
        zoom: job.zoom,
      });
      continue;
    }

    files.push({
      path: job.repoPath,
      source: job.sourceUrl,
      bytes: buffer.length,
      sha256: sha256(buffer),
      licence: job.licence,
      kind: job.kind,
      zoom: job.zoom,
    });
    job.buffer = buffer;
  }

  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  absent.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  // --- Serialise the canonical style. -------------------------------------
  const styleText = `${JSON.stringify(style, null, 2)}\n`;
  const styleBuffer = Buffer.from(styleText);

  const manifest = {
    note: "Vendored OpenGIS basemap assets for deterministic screenshots. Generated by `npm run fixtures:refresh`; do not edit by hand.",
    style: {
      source: styleUrl,
      path: repoRelative(STYLE_PATH),
      bytes: styleBuffer.length,
      sha256: sha256(styleBuffer),
    },
    files,
    absent,
  };
  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;

  // --- Write, then prune stale assets. ------------------------------------
  mkdirSync(SITE_DIR, { recursive: true });

  for (const { job } of fetched) {
    if (!job.buffer) {
      continue;
    }
    const absolute = path.join(REPO_ROOT, job.repoPath);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, job.buffer);
  }

  writeFileSync(STYLE_PATH, styleBuffer);
  writeFileSync(MANIFEST_PATH, manifestText);

  const desired = new Set(files.map((file) => file.path));
  for (const absolute of walkFiles(SITE_DIR)) {
    if (!desired.has(repoRelative(absolute))) {
      rmSync(absolute);
    }
  }
  removeEmptyDirs(SITE_DIR);

  const tileCount = files.filter((file) => file.kind === "tile").length;
  const glyphCount = files.filter((file) => file.kind === "glyph").length;
  const spriteCount = files.filter((file) => file.kind === "sprite").length;
  const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0);

  process.stdout.write(
    `[basemap] vendored ${tileCount} tiles, ${glyphCount} glyphs, ` +
      `${spriteCount} sprite files (${(totalBytes / 1048576).toFixed(2)} MB); ` +
      `${absent.length} absent\n`,
  );
}

const invokedDirectly =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  run().catch((error) => {
    process.stderr.write(`[basemap] ${error.message}\n`);
    process.exitCode = 1;
  });
}
