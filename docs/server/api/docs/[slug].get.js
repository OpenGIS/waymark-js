export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug");
  const page = await readDocsAsset(`docs-pages/${slug}.json`);
  if (!page) {
    throw createError({ statusCode: 404, statusMessage: "Page not found" });
  }
  return page;
});
