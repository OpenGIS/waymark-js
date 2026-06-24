import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function getMarkdownHeadings(content) {
  const headings = new Set();
  const regex = /^##+\s+(.+)$/gm;
  let match;

  while ((match = regex.exec(content)) !== null) {
    headings.add(match[1].trim());
  }

  return headings;
}

function getDescribeBlocks(content) {
  const describes = new Set();
  const regex = /(?:describe|test\.describe)\(\s*["'`](.+?)["'`]/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    describes.add(match[1].trim());
  }

  return describes;
}

const manifest = JSON.parse(readText("scripts/doc-test-contract.json"));
const errors = [];
const docHeadingCache = new Map();
const testDescribeCache = new Map();

for (const rule of manifest.requiredHeadings) {
  const content = readText(rule.file);
  const headings = getMarkdownHeadings(content);
  docHeadingCache.set(rule.file, headings);

  for (const heading of rule.headings) {
    if (!headings.has(heading)) {
      errors.push(`Missing heading \"${heading}\" in ${rule.file}`);
    }
  }
}

for (const mapping of manifest.describeMappings) {
  const docHeadings = docHeadingCache.get(mapping.docFile) ?? new Set();
  if (!docHeadings.has(mapping.heading)) {
    errors.push(
      `Mapping heading \"${mapping.heading}\" not found in ${mapping.docFile}`,
    );
  }

  for (const testTarget of mapping.tests) {
    if (!testDescribeCache.has(testTarget.file)) {
      const testContent = readText(testTarget.file);
      testDescribeCache.set(testTarget.file, getDescribeBlocks(testContent));
    }

    const describes = testDescribeCache.get(testTarget.file);
    if (!describes.has(testTarget.describe)) {
      errors.push(
        `Missing describe \"${testTarget.describe}\" in ${testTarget.file}`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error("\nDoc/test contract check failed:\n");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Doc/test contract check passed.");
