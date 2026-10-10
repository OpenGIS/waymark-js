/**
 * Nuxt configuration for the Waymark JS documentation site.
 *
 * A statically generated (SSG) app: `nuxt generate docs` (run from the repo
 * root) prerenders every docs route to HTML and emits it under
 * docs/.output/public, which the docs deploy workflow publishes to GitHub
 * Pages.
 */

import { fileURLToPath } from "node:url";

// The single deployment value: one URL drives both the canonical host and the
// asset base path. `NUXT_PUBLIC_PRODUCTION_URL` is the only value a deploy sets
// (the Deploy docs workflow derives it from the Pages action at deploy time);
// the code default is the deployed ogis.org project site.
const productionUrl =
  process.env.NUXT_PUBLIC_PRODUCTION_URL || "https://www.ogis.org/waymark-js";
// The asset base path derives from the production URL's pathname when a deploy
// URL is supplied, and stays / for local dev with nothing set. The trailing
// slash is normalised so a bare origin yields / and a subpath yields a
// trailing-slashed prefix.
const baseURL = process.env.NUXT_PUBLIC_PRODUCTION_URL
  ? new URL(productionUrl).pathname.replace(/\/?$/, "/")
  : "/";
// Hosted OpenGIS branding assets: the theme stylesheet and the background-map
// module, both linked in the head below. This is baked into the emitted HTML at
// dev-start/build time and is deliberately not exposed on the client runtime
// config, because no page reads it at runtime.
const brandingUrl =
  process.env.NUXT_PUBLIC_BRANDING_URL || "https://www.ogis.org/branding";
// Favicon path, prefixed with the deployment base URL so it resolves both from
// a domain root and from a subpath build (for example /Waymark-JS/).
const faviconHref = `${baseURL.replace(/\/$/, "")}/waymark-logo.svg`;

export default defineNuxtConfig({
  compatibilityDate: "2026-10-09",
  ssr: true,

  // Nuxt 4 native layout: docs/ is the app root (the repo root stays a pure
  // library). Source lives under docs/app/ (the default srcDir); server/,
  // public/ and modules/ sit alongside it under docs/.
  devtools: false,
  telemetry: false,

  modules: [fileURLToPath(new URL("./modules/docs-pages.js", import.meta.url))],

  css: ["~/assets/css/docs.css"],

  vite: {
    plugins: [
      {
        // Nuxt's Vite client build defines `module.hot` (webpack compatibility).
        // Vite applies that define to globalThis in dev, leaving a real
        // `window.module` object. The hosted OpenGIS background-map loader then
        // pulls in the Waymark v1 UMD bundle, whose wrapper takes its CommonJS
        // branch whenever `module` exists and calls `require()`, which is not
        // defined in a browser. Dropping the define keeps dev console-clean and
        // matches the generated output (which never emits the runtime define).
        name: "waymark-drop-module-hot-define",
        configResolved(config) {
          if (config.define) delete config.define["module.hot"];
        },
      },
    ],
  },

  app: {
    // Base path derived from the deployment value above (see top of file).
    baseURL,
    head: {
      htmlAttrs: { lang: "en" },
      charset: "utf-8",
      viewport: "width=device-width, initial-scale=1",
      meta: [{ name: "color-scheme", content: "light dark" }],
      link: [
        { rel: "icon", type: "image/svg+xml", href: faviconHref },
        { rel: "stylesheet", href: `${brandingUrl}/assets/css/ogis.css` },
      ],
      script: [
        { src: `${brandingUrl}/assets/js/background-map.js`, defer: true },
      ],
    },
  },

  runtimeConfig: {
    public: {
      // Absolute site URL used to build each page's <link rel="canonical">.
      // This is the same single deployment value that drives the asset base
      // path above; override with NUXT_PUBLIC_PRODUCTION_URL.
      productionUrl,
    },
  },
});
