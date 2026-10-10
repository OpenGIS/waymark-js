/**
 * Read a generated docs JSON asset from the Nitro server assets. The storage
 * driver may return a parsed object or the raw string depending on the file
 * type, so normalise both.
 */
export async function readDocsAsset(key) {
  const item = await useStorage("assets:server").getItem(key);
  if (item === null || item === undefined) return null;
  return typeof item === "string" ? JSON.parse(item) : item;
}
