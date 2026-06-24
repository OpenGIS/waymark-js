import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const CONTRACT_PATH = path.join(
  ROOT,
  "docs",
  ".generated",
  "api-contract.json",
);
const API_DOC_PATH = path.join(ROOT, "docs", "1.api.md");

if (!fs.existsSync(CONTRACT_PATH)) {
  console.error(
    "Missing docs/.generated/api-contract.json. Run: npm run api:contract",
  );
  process.exit(1);
}

const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, "utf8"));
const apiDoc = fs.readFileSync(API_DOC_PATH, "utf8");

function extractMarkerBlock(content, marker) {
  const regex = new RegExp(
    `<!-- api-contract:${marker}:start -->\\n([\\s\\S]*?)\\n<!-- api-contract:${marker}:end -->`,
  );
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

function renderList(items) {
  return items.map((item) => `- \`${item}\``).join("\n");
}

const expectedBlocks = {
  signature: `\`${contract.signature}\``,
  defaults: [
    `- \`map.options.center\`: \`[${contract.defaults.center.join(", ")}]\``,
    `- \`map.options.zoom\`: \`${contract.defaults.zoom}\``,
    `- \`map.options.style\`: \`${contract.defaults.style}\``,
    `- \`map.options.attributionControl\`: \`${contract.defaults.attributionControl}\``,
  ].join("\n"),
  "lifecycle-events": renderList(contract.lifecycleEvents),
  "forwarded-map-events": renderList(contract.forwardedMapEvents),
};

const errors = [];
for (const [marker, expected] of Object.entries(expectedBlocks)) {
  const actual = extractMarkerBlock(apiDoc, marker);

  if (actual == null) {
    errors.push(`Missing marker block: api-contract:${marker}`);
    continue;
  }

  if (actual !== expected.trim()) {
    errors.push(
      [
        `Marker block mismatch for api-contract:${marker}`,
        `Expected:\n${expected}`,
        `Actual:\n${actual}`,
      ].join("\n\n"),
    );
  }
}

if (errors.length > 0) {
  console.error("\nAPI doc sync check failed:\n");
  for (const error of errors) {
    console.error(`- ${error}\n`);
  }
  process.exit(1);
}

console.log("API doc sync check passed.");
