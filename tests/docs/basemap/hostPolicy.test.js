import { describe, expect, it } from "vitest";

import {
  assertCommittableUrl,
  assertStyleHosts,
  HostPolicyError,
  isCommittableHost,
} from "../../fixtures/basemap/refresh.mjs";

describe("basemap generator host policy", () => {
  it("accepts the canonical asset hosts", () => {
    expect(isCommittableHost("www.ogis.org")).toBe(true);
    expect(isCommittableHost("tiles.openfreemap.org")).toBe(true);
    expect(() =>
      assertCommittableUrl(
        "https://www.ogis.org/basemap/fonts/Noto%20Sans%20Regular/0-255.pbf",
      ),
    ).not.toThrow();
    expect(() =>
      assertCommittableUrl(
        "https://tiles.openfreemap.org/planet/20261004_113936_pt/{z}/{x}/{y}.pbf",
      ),
    ).not.toThrow();
  });

  it("aborts on a non-committable host", () => {
    expect(() =>
      assertCommittableUrl("https://cdn.example.com/tiles.pbf"),
    ).toThrow(HostPolicyError);
    expect(() =>
      assertCommittableUrl("https://cdn.example.com/tiles.pbf"),
    ).toThrow(/Non-committable host "cdn\.example\.com"/);
  });

  it("aborts on a documented excluded host", () => {
    expect(() =>
      assertCommittableUrl(
        "https://legacy.example.github.io/basemap/style.json",
      ),
    ).toThrow(/Excluded host/);
  });

  it("validates every host a style references", () => {
    expect(() =>
      assertStyleHosts({
        version: 8,
        glyphs: "https://cdn.example.com/{fontstack}/{range}.pbf",
        sprite: "https://www.ogis.org/basemap/sprite",
        sources: {
          openmaptiles: {
            type: "vector",
            url: "https://tiles.openfreemap.org/planet",
          },
        },
      }),
    ).toThrow(HostPolicyError);

    expect(() =>
      assertStyleHosts({
        version: 8,
        glyphs: "https://www.ogis.org/basemap/fonts/{fontstack}/{range}.pbf",
        sprite: "https://www.ogis.org/basemap/sprite",
        sources: {
          openmaptiles: {
            type: "vector",
            url: "https://tiles.openfreemap.org/planet",
          },
          attribution: { type: "vector", attribution: "<a>Credit</a>" },
        },
      }),
    ).not.toThrow();
  });
});
