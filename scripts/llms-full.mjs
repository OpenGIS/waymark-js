/**
 * Owns the committed LLM-readable docs artefacts.
 *
 * Generates the single-file full-context bundle for consumers and agents:
 * reads docs/llms.txt, resolves every relative markdown link target in link
 * order, strips per-file frontmatter and api-contract sync markers, and
 * concatenates the documents into docs/llms-full.txt.
 *
 * It also publishes tracked, byte-for-byte copies of both llms files under
 * docs/public/ for repository indexing (docs/llms.txt -> docs/public/llms.txt
 * and docs/llms-full.txt -> docs/public/llms-full.txt).
 *
 * See https://llmstxt.org/ for the llms.txt / llms-full.txt convention.
 *
 * Usage: node scripts/llms-full.mjs [--check]
 *   --check  Verify docs/llms-full.txt and both published copies under
 *            docs/public/ are up to date without writing them.
 */

import fs from "node:fs";
import path from "node:path";
import prettier from "prettier";

const ROOT = path.resolve(import.meta.dirname, "..");
const DOCS = path.join(ROOT, "docs");
const INDEX = path.join(DOCS, "llms.txt");
const OUTPUT = path.join(DOCS, "llms-full.txt");
const PUBLIC = path.join(DOCS, "public");
// Tracked published copies of the docs sources, for repository indexing.
const PUBLISHED = [
  { source: INDEX, output: path.join(PUBLIC, "llms.txt") },
  { source: OUTPUT, output: path.join(PUBLIC, "llms-full.txt") },
];
const CHECK = process.argv.includes("--check");

// Strip YAML frontmatter (--- ... ---) from the top of a file
function stripFrontmatter(content) {
  return content.replace(/^---[\s\S]*?---\n?/, "").trimStart();
}

// Strip api-contract marker comments (sync automation internals)
function stripContractMarkers(content) {
  return content.replace(/^\s*<!--\s*api-contract:.*?-->\s*\n?/gm, "");
}

// Strip the api-contract NOTE block (sync automation info, not consumer-relevant)
function stripContractNote(content) {
  return content.replace(
    />\s*\[!NOTE\]\s*\n>\s*API heading names and `api-contract` marker blocks are enforced by sync automation\. Change them only alongside matching tests and sync scripts\.\s*\n/g,
    "",
  );
}

const index = fs.readFileSync(INDEX, "utf8");

const targets = [];
for (const match of index.matchAll(/\]\(([^)]+\.md)\)/g)) {
  targets.push(match[1]);
}

const sections = targets.map((target) => {
  const source = fs.readFileSync(path.join(DOCS, target), "utf8");
  return stripContractNote(stripContractMarkers(stripFrontmatter(source)));
});

const bundle = `${sections.join("\n\n---\n\n").trimEnd()}\n`;

// Format with Prettier so the generated file passes format:check
const formatted = await prettier.format(bundle, { parser: "markdown" });

if (CHECK) {
  let current = null;
  try {
    current = fs.readFileSync(OUTPUT, "utf8");
  } catch {
    // Missing output counts as stale.
  }

  const bundleFresh =
    current !== null &&
    Buffer.from(current, "utf8").equals(Buffer.from(formatted, "utf8"));

  // A missing or differing published copy counts as stale.
  const staleCopies = PUBLISHED.filter(({ source, output }) => {
    try {
      return !fs.readFileSync(source).equals(fs.readFileSync(output));
    } catch {
      return true;
    }
  });

  if (bundleFresh && staleCopies.length === 0) {
    console.log("docs/llms-full.txt is up to date.");
    process.exit(0);
  }

  if (!bundleFresh) {
    console.error(
      "docs/llms-full.txt is out of date — run npm run docs:sync to regenerate it.",
    );
  }
  for (const { output } of staleCopies) {
    console.error(
      `${path.relative(ROOT, output)} is out of date — run npm run docs:sync to regenerate it.`,
    );
  }
  process.exit(1);
}

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, formatted, "utf8");
console.log(`Written: ${path.relative(ROOT, OUTPUT)}`);

// Publish tracked copies for repository indexing.
fs.mkdirSync(PUBLIC, { recursive: true });
for (const { source, output } of PUBLISHED) {
  fs.copyFileSync(source, output);
  console.log(`Written: ${path.relative(ROOT, output)}`);
}
