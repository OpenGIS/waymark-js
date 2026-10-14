import { describe, expect, it } from "vitest";

import {
  COVERAGE_ZOOMS,
  DEMO_ENVELOPE,
  TILE_PAD,
} from "../../fixtures/basemap/demoArea.mjs";
import {
  enumerateTiles,
  tileKey,
  tileRanges,
  tileXFromLng,
  tileYFromLat,
} from "../../fixtures/basemap/enumerate.mjs";

describe("basemap tile enumeration", () => {
  it("maps longitude and latitude to tile indices", () => {
    expect(tileXFromLng(-180, 0)).toBe(0);
    expect(tileXFromLng(0, 0)).toBe(0);
    expect(tileXFromLng(180, 0)).toBe(0);
    expect(tileXFromLng(0, 1)).toBe(1);
    expect(tileXFromLng(90, 1)).toBe(1);
    expect(tileXFromLng(-90, 1)).toBe(0);

    expect(tileYFromLat(0, 0)).toBe(0);
    expect(tileYFromLat(85, 0)).toBe(0);
    expect(tileYFromLat(-85, 0)).toBe(0);
    expect(tileYFromLat(0, 1)).toBe(1);
    expect(tileYFromLat(85, 1)).toBe(0);
    expect(tileYFromLat(-85, 1)).toBe(1);
  });

  it("clamps latitude beyond the Web-Mercator bound", () => {
    expect(tileYFromLat(90, 4)).toBe(0);
    expect(tileYFromLat(-90, 4)).toBe(2 ** 4 - 1);
  });

  it("enumerates the whole world as zoom, column, row", () => {
    const tiles = enumerateTiles(
      { west: -180, south: -85, east: 180, north: 85 },
      { minZoom: 0, maxZoom: 1, pad: 0 },
    );

    expect(tiles.map(tileKey)).toEqual([
      "0/0/0",
      "1/0/0",
      "1/0/1",
      "1/1/0",
      "1/1/1",
    ]);
  });

  it("pads and clamps tile ranges to the tile pyramid", () => {
    expect(
      tileRanges(
        { west: 0, south: 0, east: 0, north: 0 },
        { minZoom: 0, maxZoom: 0, pad: 2 },
      ),
    ).toEqual([{ zoom: 0, minX: 0, maxX: 0, minY: 0, maxY: 0 }]);

    expect(
      tileRanges(
        { west: -180, south: -85, east: 180, north: 85 },
        { minZoom: 1, maxZoom: 1, pad: 1 },
      ),
    ).toEqual([{ zoom: 1, minX: 0, maxX: 1, minY: 0, maxY: 1 }]);
  });

  it("is deterministic and ordered by zoom, column then row", () => {
    const first = enumerateTiles(DEMO_ENVELOPE, {
      minZoom: 0,
      maxZoom: 14,
      pad: TILE_PAD,
    });
    const second = enumerateTiles(DEMO_ENVELOPE, {
      minZoom: 0,
      maxZoom: 14,
      pad: TILE_PAD,
    });

    expect(second).toEqual(first);
    expect(first.length).toBe(2126);

    const keys = first.map(tileKey);
    expect(keys).toEqual(
      [...keys].sort((a, b) => {
        const [za, xa, ya] = a.split("/").map(Number);
        const [zb, xb, yb] = b.split("/").map(Number);
        return za - zb || xa - xb || ya - yb;
      }),
    );
  });

  it("covers the derived demo envelope at every zoom 0..14", () => {
    const ranges = tileRanges(DEMO_ENVELOPE, {
      minZoom: COVERAGE_ZOOMS[0],
      maxZoom: COVERAGE_ZOOMS[COVERAGE_ZOOMS.length - 1],
      pad: TILE_PAD,
    });

    expect(ranges.map((range) => range.zoom)).toEqual([...COVERAGE_ZOOMS]);
    expect(ranges.at(-1)).toEqual({
      zoom: 14,
      minX: 2344,
      maxX: 2392,
      minY: 5491,
      maxY: 5519,
    });
  });
});
