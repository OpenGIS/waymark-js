<script setup>
const props = defineProps({
  page: { type: Object, required: true },
});

const route = useRoute();
const config = useRuntimeConfig();

// The home page hoists the rendered <h1> into a hero heading above the page
// body. Every other page keeps the plain rendered <h1>.
const isHome = computed(() => route.path.replace(/^\/+|\/+$/g, "") === "");

// The rendered <h1> id (the heading slug) is reused by the hero so existing
// anchors keep resolving.
const homeHeadingId = computed(() => {
  const match = props.page.html.match(/^\s*<h1\b[^>]*\sid="([^"]+)"/);
  return match ? match[1] : "waymark-js-docs";
});

// Strip the rendered <h1> so the hero can render the heading without
// duplicating it.
const bodyHtml = computed(() =>
  isHome.value
    ? props.page.html.replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/, "")
    : props.page.html,
);

// One canonical per page, built from the configured production URL (env
// `NUXT_PUBLIC_PRODUCTION_URL`, default the deployed ogis.org project site) plus
// the logical route path. Vue Router strips the app base URL, so route.path is
// the same logical path whether the site is served from `/` or `/Waymark-JS/`.
const canonical = computed(() => {
  const base = config.public.productionUrl.replace(/\/+$/, "");
  const path = route.path.replace(/^\/+|\/+$/g, "");
  return path ? `${base}/${path}` : `${base}/`;
});

useHead(() => ({
  title: isHome.value ? props.page.title : `${props.page.title} — Waymark JS`,
  link: [{ rel: "canonical", href: canonical.value }],
}));

useCodeCopy();
</script>

<template>
  <main v-if="isHome" class="docs-home">
    <h1 :id="homeHeadingId" class="docs-hero">{{ page.title }}</h1>
    <div class="docs-home-body" v-html="bodyHtml" />
  </main>
  <main v-else v-html="page.html" />
  <nav
    v-if="page.prev || page.next"
    class="doc-pager"
    aria-label="Document navigation"
  >
    <NuxtLink
      v-if="page.prev"
      class="pager-link pager-prev"
      :to="page.prev.route"
    >
      <span class="pager-arrow" aria-hidden="true">&larr;</span>
      <span>{{ page.prev.label }}</span>
    </NuxtLink>
    <NuxtLink
      v-if="page.next"
      class="pager-link pager-next"
      :to="page.next.route"
    >
      <span>{{ page.next.label }}</span>
      <span class="pager-arrow" aria-hidden="true">&rarr;</span>
    </NuxtLink>
  </nav>
</template>
