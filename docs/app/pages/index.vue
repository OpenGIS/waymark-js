<script setup>
const { data: page, error } = await useDocsJson(
  "docs-page:index",
  "api/docs/index",
);

if (error.value || !page.value) {
  throw createError({ statusCode: 404, statusMessage: "Page not found" });
}
</script>

<template>
  <DocPage v-if="page" :page="page" />
</template>
