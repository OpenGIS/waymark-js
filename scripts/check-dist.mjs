import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST_DIR = path.join(ROOT, "dist");
const BUNDLE_NAME = "waymark.js";
const BUNDLE_PATH = path.join(DIST_DIR, BUNDLE_NAME);

const errors = [];

if (!existsSync(BUNDLE_PATH)) {
  errors.push(`Missing bundle: ${path.relative(ROOT, BUNDLE_PATH)}`);
}

if (existsSync(DIST_DIR)) {
  const entries = readdirSync(DIST_DIR).sort();
  const unexpected = entries.filter((entry) => entry !== BUNDLE_NAME);

  if (unexpected.length > 0) {
    errors.push(`Unexpected dist output: ${unexpected.join(", ")}`);
  }
}

let bundle = "";
if (existsSync(BUNDLE_PATH)) {
  bundle = readFileSync(BUNDLE_PATH, "utf8");
}

if (bundle) {
  if (!/from\s*["']maplibre-gl["']/.test(bundle)) {
    errors.push('Bundle must keep "maplibre-gl" as a bare external import.');
  }

  const forbidden = [
    ["data:text/javascript;base64", "inlined base64 worker blob"],
    ["maplibre-gl-worker", "bundled MapLibre worker"],
    ["setWorkerUrl", "setWorkerUrl worker accommodation"],
    ["@vitejs/plugin-vue", "Vue plugin marker"],
    ["@vue/", "Vue runtime package marker"],
    ["__vue__", "Vue instance marker"],
    ["createVNode", "Vue render function"],
    ["createElementVNode", "Vue render function"],
  ];

  for (const [needle, description] of forbidden) {
    if (bundle.includes(needle)) {
      errors.push(`Bundle contains ${description}: ${needle}`);
    }
  }

  if (/\.css["']/.test(bundle)) {
    errors.push("Bundle must not import or emit CSS.");
  }
}

if (errors.length > 0) {
  console.error("\ncheck:dist failed:\n");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  console.error("");
  process.exit(1);
}

console.log(
  "check:dist passed: dist contains only waymark.js with a bare maplibre-gl import, no CSS, no inline worker and no Vue.",
);
