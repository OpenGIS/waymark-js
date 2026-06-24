/**
 * Generates the project skill file for agents.
 *
 * Assembles a skill file for use with opencode, combining static context
 * about Waymark JS with the full content of each documentation page.
 *
 * Output path is fixed: .agents/skills/waymark-js/SKILL.md
 *
 * Usage: node scripts/skill-md.js
 */

import fs from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DOCS_DIR = path.join(ROOT, "docs");
const OUTPUT = path.join(ROOT, ".agents", "skills", "waymark-js", "SKILL.md");

// Strip Nuxt Content frontmatter (--- ... ---) from the top of a file
function stripFrontmatter(content) {
  return content.replace(/^---[\s\S]*?---\n?/, "").trimStart();
}

// Read doc files in filename order (1.development.md, 2.instances.md, …)
const docFiles = fs
  .readdirSync(DOCS_DIR)
  .filter((f) => f.endsWith(".md"))
  .sort();

const docSections = docFiles
  .map((file) => {
    const raw = fs.readFileSync(path.join(DOCS_DIR, file), "utf8");
    return stripFrontmatter(raw);
  })
  .join("\n\n---\n\n");

const skill = `---
name: waymark-js
description: Waymark JS reference. Use when working on source, docs, tests, or API/config behaviour for the MapLibre-based library.
---

# Waymark JS

Waymark JS is a small JavaScript map library built on [MapLibre GL](https://maplibre.org/). It exposes a simple \`createInstance(...)\` API, forwards map configuration through \`config.map.options\`, and gives direct access to the underlying MapLibre instance.

**Key facts:**
- Entry point: \`import { createInstance } from './dist/waymark.js'\`
- Source: \`src/\` — built with Vite into \`dist/\`
- Tests: \`npm test\` and \`npm run test:browser\` (workflow in \`docs/2.development.md\`)
- Docs source: \`docs/\` (also generates this skill file)

---

${docSections}
`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, skill, "utf8");
console.log(`Written: ${path.relative(ROOT, OUTPUT)}`);
