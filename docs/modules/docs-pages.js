/**
 * Nuxt module for the Waymark JS documentation site.
 *
 * At build time it:
 *   1. copies the repository's tracked screenshots, the two llms files, and the
 *      Waymark mark (as the site favicon) into the app's public directory
 *      (served verbatim, byte-identical);
 *   2. renders every docs page once and writes it to the Nitro server assets,
 *      where the /api/docs/* routes read it from.
 *
 * The payload is kept out of the JS bundle on purpose: Nuxt and Nitro replace
 * process.env.* keys at build time with a string-unaware pass, and the docs
 * legitimately contain the literal `process.env.NODE_ENV` in prose, which
 * would corrupt any bundled string copy. Server assets are copied verbatim and
 * read at runtime, so the content never passes through the JS transform.
 */

import fs from "node:fs";
import path from "node:path";
import { defineNuxtModule } from "@nuxt/kit";
import { buildDocsPayload } from "../app/lib/docs-content.mjs";

const DATA_DIR = "docs-pages";

export default defineNuxtModule({
  meta: {
    name: "docs-pages",
    configKey: "docsPages",
  },
  setup(_options, nuxt) {
    const appRoot = nuxt.options.rootDir;
    const docsDir = appRoot;
    const assetsSrcDir = path.join(docsDir, "assets");
    const screenshotsDir = path.join(appRoot, "..", "screenshots");
    const publicDir = path.join(appRoot, "public");
    const assetsDir = path.join(appRoot, "server", "assets", DATA_DIR);

    // 1. Public assets: screenshots plus the two llms files at the root.
    fs.mkdirSync(path.join(publicDir, "screenshots"), { recursive: true });
    if (fs.existsSync(screenshotsDir)) {
      fs.cpSync(screenshotsDir, path.join(publicDir, "screenshots"), {
        recursive: true,
        force: true,
      });
    }
    for (const name of ["llms.txt", "llms-full.txt"]) {
      fs.copyFileSync(path.join(docsDir, name), path.join(publicDir, name));
    }
    // The Waymark mark doubles as the site favicon; copy it verbatim.
    fs.copyFileSync(
      path.join(assetsSrcDir, "waymark-logo.svg"),
      path.join(publicDir, "waymark-logo.svg"),
    );

    // 2. Content: render each page and store it as a server asset.
    const baseURL = nuxt.options.app.baseURL || "/";
    const payload = buildDocsPayload({ docsDir, baseURL });

    if (payload.unexpectedImageSrcs.length > 0) {
      console.warn(
        `[docs-pages] Unexpected relative image src(s): ${payload.unexpectedImageSrcs.join(", ")}`,
      );
    }

    fs.mkdirSync(assetsDir, { recursive: true });
    const writeJson = (name, data) =>
      fs.writeFileSync(
        path.join(assetsDir, `${name}.json`),
        `${JSON.stringify(data, null, 2)}\n`,
      );
    writeJson("nav", payload.nav);
    for (const [route, page] of Object.entries(payload.pages)) {
      writeJson(route === "/" ? "index" : route.slice(1), page);
    }
  },
});
