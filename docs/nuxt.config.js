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
    baseURL: "/waymark-js/",
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
        { rel: "icon", type: "image/svg", href: "/waymark-js/assets/icon/waymark.svg" },
      ],
    },
  },
});
