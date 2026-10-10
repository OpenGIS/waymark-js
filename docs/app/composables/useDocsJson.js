/**
 * Fetch a generated docs JSON payload from the internal /api/docs routes,
 * respecting the configured app base URL. The result is inlined into each
 * prerendered page's Nuxt payload, so the client reuses it without a second
 * request.
 */
export function useDocsJson(key, relativePath) {
  const baseURL = useRuntimeConfig().app.baseURL || "/";
  const prefix = baseURL.endsWith("/") ? baseURL : `${baseURL}/`;
  return useAsyncData(key, () => $fetch(`${prefix}${relativePath}`));
}
