<script setup>
const { data: nav } = await useDocsJson("docs-nav", "api/docs/nav");

const route = useRoute();
const baseURL = useRuntimeConfig().app.baseURL;

// Vue Router strips the app base from route paths; guard for both shapes so
// the active state holds with or without a non-root baseURL.
function isCurrent(target) {
  let path = route.path;
  const base = baseURL.replace(/\/$/, "");
  if (base && path.startsWith(base)) {
    path = path.slice(base.length) || "/";
  }
  const normalized = path.replace(/\/+$/, "") || "/";
  const expected = target.replace(/\/+$/, "") || "/";
  return normalized === expected;
}
</script>

<template>
  <header class="site-header">
    <div
      class="background-map background-map--invert"
      data-background-map="invert"
      aria-hidden="true"
    ></div>
    <NuxtLink
      class="site-brand waymark-mark"
      to="/"
      aria-label="Waymark JS Docs"
    >
      <WaymarkLogo class="brand-mark waymark-mark__logo" :size="88" />
      <span class="waymark-mark__js" aria-hidden="true">JS</span>
    </NuxtLink>
  </header>

  <nav class="site-nav" aria-label="Documentation">
    <NuxtLink
      v-for="item in nav || []"
      :key="item.route"
      :to="item.route"
      :aria-current="isCurrent(item.route) ? 'page' : undefined"
      >{{ item.label }}</NuxtLink
    >
  </nav>

  <slot />

  <footer class="site-footer">
    <div class="footer-left"><a href="https://www.ogis.org/">ogis.org</a></div>
    <div class="footer-middle"><OgisLogo :size="16" /></div>
    <div class="footer-right">
      <a
        href="https://github.com/OpenGIS/Waymark-JS"
        rel="noopener"
        aria-label="OpenGIS/Waymark-JS on GitHub"
        style="display: inline-flex; align-items: center"
      >
        <svg
          viewBox="0 0 16 16"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          focusable="false"
          style="display: block; width: 18px; height: 18px"
        >
          <path
            fill="currentColor"
            d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
          />
        </svg>
      </a>
    </div>
  </footer>
</template>
