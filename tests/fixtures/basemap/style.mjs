/**
 * Style-loading plumbing for the vendored basemap fixture.
 *
 * Kept in the fixtures layer and free of Node built-ins so both the dev harness
 * and the browser tests share one source of truth for the style URL and for the
 * transform that makes it consumable by MapLibre.
 */

/**
 * Root-relative URL of the vendored, canonical style. Root-relative so the same
 * value resolves against whatever origin and port the dev server uses, with no
 * external host baked in.
 */
export const BASEMAP_STYLE_URL = "/basemap/style.json";

/**
 * Resolve the vendored style's root-relative sprite URL against the document
 * origin, for use as a MapLibre `transformStyle` function.
 *
 * MapLibre requires an absolute `sprite` URL and throws on a relative one
 * (`normalizeSpriteURL`), while the fixture authors every URL root-relative so
 * it stays origin- and port-independent. This transform supplies the origin at
 * load time. Only `sprite` is rewritten: glyph and tile URLs carry
 * `{placeholder}` templates that must survive untouched, and MapLibre resolves
 * those relative URLs itself.
 *
 * @param {unknown} _previousStyle
 * @param {Record<string, unknown>} nextStyle
 * @returns {Record<string, unknown>}
 */
export function absolutizeSpriteURLs(_previousStyle, nextStyle) {
  const origin = globalThis.location?.origin;

  if (!origin || !nextStyle || typeof nextStyle !== "object") {
    return nextStyle;
  }

  const absolute = (url) =>
    typeof url === "string" && url.length > 0 ? new URL(url, origin).href : url;

  const { sprite } = nextStyle;

  if (typeof sprite === "string") {
    return { ...nextStyle, sprite: absolute(sprite) };
  }

  if (Array.isArray(sprite)) {
    return {
      ...nextStyle,
      sprite: sprite.map((entry) =>
        entry && typeof entry === "object"
          ? { ...entry, url: absolute(entry.url) }
          : entry,
      ),
    };
  }

  return nextStyle;
}
