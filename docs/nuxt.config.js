// Full URL where the generated docs are served; override with
// NUXT_APP_BASE_URL to relocate the site without code changes.
const baseURL = new URL(
  process.env.NUXT_APP_BASE_URL || "https://www.ogis.org/waymark-js/",
);
if (!baseURL.pathname.endsWith("/")) baseURL.pathname += "/";
// Nuxt reserves NUXT_APP_BASE_URL for its own path-only override of
// app.baseURL. Unset it once read so the full URL isn't applied as a path.
delete process.env.NUXT_APP_BASE_URL;

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },
  modules: ["@nuxt/content"],
  content: {
    documentDriven: true,
    highlight: {
      theme: "github-dark",
    },
    // markdown: {
    //   remarkPlugins: {
    //     "remark-gfm": true,
    //     // "remark-prism": true,
    //   },
    // },
  },

  css: [
    "~/assets/main.less",
    "github-markdown-css/github-markdown-light.css",
    // "prism-theme-github/themes/prism-theme-github-dark.css",
    "~/assets/prism.css",
  ],

  app: {
    baseURL: baseURL.pathname, // router base path
    cdnURL: baseURL.href, // absolute base for asset references
    head: {
      script: [
        {
          src: "https://www.googletagmanager.com/gtag/js?id=G-CXSJLNFJHB",
          async: true,
        },
        {
          children: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-CXSJLNFJHB');
          `,
        },
      ],
      link: [
        {
          rel: "icon",
          type: "image/svg",
          href: `${baseURL.href}assets/icon/waymark.svg`,
        },
      ],
    },
  },
});
