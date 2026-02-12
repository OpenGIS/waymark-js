/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import WaymarkLine from "../library/classes/Overlays/Line.js";

describe("WaymarkLine", () => {
  it("should be able to be instantiated with empty object", () => {
    // This is expected to fail currently with "TypeError: can't access property 'type', feature.geometry is undefined"
    const line = new WaymarkLine({});
    expect(line).toBeDefined();
    expect(line.geometry).toBeDefined();
    expect(line.geometry.type).toBe("LineString");
  });

  it("should be able to be instantiated with undefined", () => {
    // This is expected to fail currently
    const line = new WaymarkLine();
    expect(line).toBeDefined();
    expect(line.geometry).toBeDefined();
    expect(line.geometry.type).toBe("LineString");
  });
});
