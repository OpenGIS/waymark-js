/**
 * Generates SKILL.md at the project root.
 *
 * Assembles a skill file for use with opencode, combining static context
 * about Waymark JS with the full content of each documentation page.
 *
 * Usage: node scripts/skill-md.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DOCS_DIR = path.join(ROOT, "docs", "content");
const OUTPUT = path.join(ROOT, "SKILL.md");

// Strip Nuxt Content frontmatter (--- ... ---) from the top of a file
function stripFrontmatter(content) {
    return content.replace(/^---[\s\S]*?---\n?/, "").trimStart();
}

// Read doc files in filename order (1.index.md, 2.map.md, …)
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
description: Waymark JS library reference. Use when working on Waymark JS source code, writing features, fixing bugs, or answering questions about the API, options, Viewer, Editor, or Map configuration.
---

# Waymark JS

Waymark JS is a JavaScript library for creating and sharing geographical information, built on [Leaflet JS](https://leafletjs.com/). It supports a read-only Viewer mode and an interactive Editor mode. Data is stored as GeoJSON, with GPX and KML import support. No API key required.

**Key facts:**
- Entry point: \`window.Waymark_Map_Factory.viewer()\` / \`window.Waymark_Map_Factory.editor()\`
- Source: \`src/\` — built with Grunt into \`dist/\`
- Tests: \`npm test\` (see \`tests/readme.md\`)
- Docs site source: \`docs/\` (Nuxt Content)

---

${docSections}
`;

fs.writeFileSync(OUTPUT, skill, "utf8");
console.log(`Written: ${path.relative(ROOT, OUTPUT)}`);
