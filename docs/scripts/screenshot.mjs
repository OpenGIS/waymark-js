// Full-page iPad-portrait screenshots of the documentation site — every content
// page plus the not-found (404) page. Spawns its own Nuxt dev server on a free
// port picked from the ephemeral range (11000-11999) so the standard
// development port is never disturbed, captures each route via system Chrome,
// writes the PNGs to screenshots/, then cleans up.
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

// Everything is anchored to this script so it runs from any working directory.
const docsRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const contentDir = path.join(docsRoot, "content");
const screenshotsDir = path.join(docsRoot, "screenshots");

// iPad portrait captured at 1x so the PNG width matches the viewport exactly.
const VIEWPORT_WIDTH = 768;
const VIEWPORT_HEIGHT = 1024;
const DEVICE_SCALE_FACTOR = 1;

const SERVER_START_TIMEOUT_MS = 90_000;
// The first page compiles on demand in dev, so allow a generous load window.
const PAGE_LOAD_TIMEOUT_MS = 90_000;
const SETTLE_MS = 400; // let fonts and map tiles finish painting
const PORT_RANGE_START = 11000;
const PORT_RANGE_END = 11999;

// Synthetic capture of the not-found page: an unknown slug (not a content
// route) drives the document-driven catch-all to render it. The rendered text
// is asserted below so a blank shell or an error dump fails loudly.
const NOT_FOUND_ROUTE = "/404";
const NOT_FOUND_TEXT = "The content you are looking for can not be found.";

fs.mkdirSync(screenshotsDir, { recursive: true });

const routes = discoverRoutes(contentDir);
routes.push({ name: "404", route: NOT_FOUND_ROUTE });
const port = await findFreePort(PORT_RANGE_START, PORT_RANGE_END);
console.log(`Using port ${port}`);

// Nuxt dev runs Nitro in a worker that never inherits NUXT_APP_BASE_URL (the
// config unsets it), so routes stay under the project's configured base path.
// Reading that base path lets us point the cdn URL at the local server, so the
// icons and the example iframes render from docs/public instead of production.
const basePath = await readBasePath();
const nuxt = spawn(
  path.join(docsRoot, "node_modules", ".bin", "nuxt"),
  ["dev", "--port", String(port)],
  {
    cwd: docsRoot,
    detached: true, // own process group so we can kill the whole tree
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      ...(basePath && {
        NUXT_APP_CDN_URL: `http://localhost:${port}${basePath}`,
      }),
    },
  },
);

try {
  const base = await waitForServerUrl(nuxt, SERVER_START_TIMEOUT_MS);
  console.log(`Nuxt ready at ${base}`);

  const browser = await chromium.launch({ channel: "chrome" });
  try {
    const page = await browser.newPage({
      viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
      deviceScaleFactor: DEVICE_SCALE_FACTOR,
    });

    for (const { name, route } of routes) {
      const url = new URL(route.replace(/^\//, ""), base).href;
      const { mode, status } = await loadPage(page, url);
      await sleep(SETTLE_MS);

      if (name === "404") {
        const text = await page.evaluate(() => document.body.innerText);
        const rendered = text.includes(NOT_FOUND_TEXT);
        console.log(
          `Not-found page responded HTTP ${status}; expected text ${rendered ? "present" : "MISSING"}`,
        );
        if (!rendered) {
          throw new Error(`Not-found page did not render: "${NOT_FOUND_TEXT}"`);
        }
      }

      const file = path.join(screenshotsDir, `${name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`Saved ${file} (${mode})`);
    }
  } finally {
    await browser.close();
  }
} finally {
  stopServer(nuxt);
}

/**
 * Recursively collects *.md files under `dir`, orders them by their numeric
 * filename prefix, and maps each to a route and an output slug. A leading "N."
 * prefix is stripped from every path segment, and a terminal "index" segment
 * maps to its parent route ("/" at the root).
 * @param {string} dir
 * @returns {Array<{ name: string, route: string }>}
 */
function discoverRoutes(dir) {
  const files = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".md")) {
        files.push(path.relative(dir, full));
      }
    }
  };
  walk(dir);

  const numberPrefix = (file) => {
    const match = path.basename(file).match(/^(\d+)\./);
    return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
  };

  return files
    .sort((a, b) => numberPrefix(a) - numberPrefix(b))
    .map((file) => {
      const segments = file
        .replace(/\.md$/, "")
        .split(path.sep)
        .map((segment) => segment.replace(/^\d+\./, ""));
      const isIndex = segments[segments.length - 1] === "index";
      const route =
        "/" + (isIndex ? segments.slice(0, -1) : segments).join("/");
      return { name: segments.join("-"), route };
    });
}

/**
 * Reads the app's base path from nuxt.config.js so routes and the local cdn
 * URL follow the project's configuration instead of a hard-coded default. The
 * config calls the Nuxt-injected `defineNuxtConfig` global, which is stubbed
 * here so the config can be imported outside of Nuxt.
 * @returns {Promise<string|null>} the base path (e.g. "/waymark-js/"), or null
 */
async function readBasePath() {
  globalThis.defineNuxtConfig = (config) => config;
  try {
    const configPath = path.join(docsRoot, "nuxt.config.js");
    const { default: config } = await import(pathToFileURL(configPath).href);
    const base = config?.app?.baseURL || "/";
    return base.endsWith("/") ? base : `${base}/`;
  } catch {
    return null;
  }
}

/**
 * Picks the first free TCP port in the inclusive range [start, end].
 * Probes each port by attempting to listen; EADDRINUSE means it is taken.
 * @param {number} start
 * @param {number} end
 * @returns {Promise<number>}
 */
function findFreePort(start, end) {
  return new Promise((resolve, reject) => {
    const tryPort = (candidate) => {
      if (candidate > end) {
        reject(new Error(`No free port in range ${start}-${end}`));
        return;
      }
      const probe = net.createServer();
      probe.unref();
      probe.once("error", (err) => {
        if (err.code === "EADDRINUSE") tryPort(candidate + 1);
        else reject(err);
      });
      probe.listen(candidate, () => {
        probe.close(() => resolve(candidate));
      });
    };
    tryPort(start);
  });
}

/**
 * Waits for Nuxt to print its "Local:" URL, then confirms the server responds.
 * ANSI escapes are stripped before matching because Nuxt colours that line.
 * @param {import("node:child_process").ChildProcess} child
 * @param {number} timeoutMs
 * @returns {Promise<string>}
 */
function waitForServerUrl(child, timeoutMs) {
  return new Promise((resolve, reject) => {
    let output = "";
    let settled = false;
    const timer = setTimeout(() => {
      reject(new Error(`Nuxt did not start within ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      if (settled) return;
      output += stripAnsi(chunk.toString());
      const match = output.match(/Local:\s+(https?:\/\/localhost:\d+\/\S*)/);
      if (!match) return;
      settled = true;
      clearTimeout(timer);
      const url = match[1].endsWith("/") ? match[1] : `${match[1]}/`;
      waitUntilResponding(url, timeoutMs)
        .then(() => resolve(url))
        .catch(reject);
    });

    child.on("error", reject);
    child.stderr.on("data", (chunk) => {
      const text = stripAnsi(chunk.toString());
      if (/error|failed/i.test(text)) console.error(`[nuxt] ${text.trim()}`);
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Nuxt exited before ready (code ${code})`));
    });
  });
}

/** Removes ANSI SGR escape sequences from a string. */
function stripAnsi(text) {
  return text.replace(/\u001B\[[0-9;]*m/g, "");
}

/** Polls the URL until it returns an HTTP 200. */
async function waitUntilResponding(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // server not up yet — retry
    }
    await sleep(250);
  }
  throw new Error(`Server at ${url} did not respond within ${timeoutMs}ms`);
}

/**
 * Navigates to `url`, preferring "networkidle". The Nuxt dev server can hold
 * connections open (HMR, on-demand compilation, map tiles), so if that stalls
 * we fall back to "load" plus a wait for the rendered content.
 * @returns {Promise<{ mode: string, status: number|undefined }>} the wait
 * strategy that succeeded and the response status
 */
async function loadPage(page, url) {
  try {
    const response = await page.goto(url, {
      waitUntil: "networkidle",
      timeout: PAGE_LOAD_TIMEOUT_MS,
    });
    return { mode: "networkidle", status: response?.status() };
  } catch {
    const response = await page.goto(url, {
      waitUntil: "load",
      timeout: PAGE_LOAD_TIMEOUT_MS,
    });
    await page
      .waitForSelector(".markdown-body", { timeout: 30_000 })
      .catch(() => {});
    return { mode: "load fallback", status: response?.status() };
  }
}

/** Kills the Nuxt process group, with a SIGKILL fallback. */
function stopServer(child) {
  if (child.exitCode !== null) return; // already exited
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
  setTimeout(() => {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      /* already gone */
    }
  }, 3_000).unref();
}
