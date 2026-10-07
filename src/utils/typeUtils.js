/**
 * Validate a type key against slug constraints.
 * Returns `true` if valid, `false` otherwise.
 *
 * @param {unknown} key
 * @returns {key is string}
 */
export function isValidTypeKey(key) {
  return (
    typeof key === "string" &&
    key.length >= 1 &&
    key.length <= 64 &&
    /^[a-z0-9]+(-[a-z0-9]+)*$/.test(key)
  );
}
