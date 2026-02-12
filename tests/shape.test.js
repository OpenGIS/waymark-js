/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import WaymarkShape from "../library/classes/Overlays/Shape.js";

describe("WaymarkShape", () => {
  it("should be able to be instantiated with empty object", () => {
    // This is expected to fail currently with "TypeError: can't access property 'type', feature.geometry is undefined"
    const shape = new WaymarkShape({});
    expect(shape).toBeDefined();
    expect(shape.geometry).toBeDefined();
    expect(shape.geometry.type).toBe("Polygon");
  });

  it("should be able to be instantiated with undefined", () => {
    // This is expected to fail currently
    const shape = new WaymarkShape();
    expect(shape).toBeDefined();
    expect(shape.geometry).toBeDefined();
    expect(shape.geometry.type).toBe("Polygon");
  });
});
