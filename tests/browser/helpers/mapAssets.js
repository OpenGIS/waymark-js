/**
 * Browser-suite request policy that keeps the tests hermetic.
 *
 * The canonical style URL and the style-loading transform live with the fixture
 * plumbing (`tests/fixtures/basemap/style.mjs`); the URL is re-exported here so
 * specs can import it alongside the guard.
 */

export { BASEMAP_STYLE_URL } from "../../fixtures/basemap/style.mjs";

/**
 * Hostnames treated as same-machine, and therefore permitted by the guard, on
 * any port.
 */
const SAME_MACHINE_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Whether a request URL is an external http(s) request that the guard must
 * block.
 *
 * Non-http(s) resources (`data:`, `blob:`, `about:`, `ws:`…) are never external:
 * they either carry no network fetch or are infrastructure the page needs.
 * Unparseable URLs are treated as non-external, leaving the browser to resolve
 * them.
 *
 * @param {string} rawUrl
 * @returns {boolean}
 */
export function isExternalRequest(rawUrl) {
  let url;

  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return false;
  }

  return !SAME_MACHINE_HOSTNAMES.has(url.hostname);
}
