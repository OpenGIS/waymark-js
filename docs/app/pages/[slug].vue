<script setup>
const route = useRoute();
const { data: page, error } = await useDocsJson(
  `docs-page:${route.params.slug}`,
  `api/docs/${route.params.slug}`,
);

if (error.value || !page.value) {
  throw createError({ statusCode: 404, statusMessage: "Page not found" });
}
</script>

<template>
  <DocPage v-if="page" :page="page" />
</template>
