import fs from "fs-extra";
import path from "path";
import { promisify } from "util";
import potrace from "potrace";
import { optimize } from "svgo";
import SVGSpriter from "svg-sprite";
import { glob } from "glob";
import SVGPathCommander from "svg-path-commander";
import fantasticon from "fantasticon";

const { generateFonts, FontAssetType, OtherAssetType } = fantasticon;
const trace = promisify(potrace.trace);

const PATHS = {
  png: "src/icons/source/png",
  svg: "src/icons/source/svg",
  dist: "src/icons",
  codepoints: "src/icons/source/codepoints.json",
};

async function processPngs() {
  const files = await fs.readdir(PATHS.png).catch(() => []);
  const pngs = files.filter((f) => f.endsWith(".png"));
  if (!pngs.length) return;

  console.log("Processing PNGs...");
  await fs.ensureDir(PATHS.svg);

  for (const file of pngs) {
    const name = path.basename(file, ".png");
    const inputPath = path.join(PATHS.png, file);
    const outputPath = path.join(PATHS.svg, `${name}.svg`);

    console.log(`  Tracing ${file}...`);
    try {
      const svgString = await trace(inputPath, {
        threshold: 128,
        optCurve: true,
        optTolerance: 0.2,
        turdSize: 2,
        turnPolicy: potrace.Potrace.TURNPOLICY_MINORITY,
      });

      const result = optimize(svgString, {
        path: outputPath,
        multipass: true,
        plugins: [
          "preset-default",
          "removeDimensions",
          {
            name: "addAttributesToSVGElement",
            params: {
              attributes: [
                { viewBox: "0 0 512 512" },
                { "fill-rule": "evenodd" },
              ],
            },
          },
        ],
      });

      await fs.writeFile(outputPath, result.data);
      console.log(`  Saved ${outputPath}`);
    } catch (err) {
      console.error(`  Error processing ${file}:`, err);
    }
  }
}

async function normalizeSvgs() {
  console.log("Normalizing SVGs to 16x16 grid...");
  const files = await glob(`${PATHS.svg}/*.svg`);

  for (const file of files) {
    try {
      const content = await fs.readFile(file, "utf8");

      const viewBoxMatch = content.match(/viewBox="([^"]+)"/);
      let viewBox = [0, 0, 16, 16];

      if (viewBoxMatch) {
        viewBox = viewBoxMatch[1].split(/[\s,]+/).map(Number);
      } else {
        const widthMatch = content.match(/width="([^"]+)"/);
        const heightMatch = content.match(/height="([^"]+)"/);
        if (widthMatch && heightMatch) {
          viewBox = [
            0,
            0,
            parseFloat(widthMatch[1]),
            parseFloat(heightMatch[1]),
          ];
        }
      }

      const newContent = content.replace(/d="([^"]+)"/g, (match, d) => {
        const pathCmd = new SVGPathCommander(d);

        if (
          viewBox[2] !== 16 ||
          viewBox[3] !== 16 ||
          viewBox[0] !== 0 ||
          viewBox[1] !== 0
        ) {
          const scaleX = 16 / viewBox[2];
          const scaleY = 16 / viewBox[3];
          const translateX = -viewBox[0];
          const translateY = -viewBox[1];

          pathCmd.transform({
            translate: [translateX, translateY],
            scale: [scaleX, scaleY],
          });
          return `d="${pathCmd.toString()}"`;
        }
        return match;
      });

      let finalContent = newContent.replace(
        /viewBox="[^"]+"/,
        'viewBox="0 0 16 16"',
      );
      if (!finalContent.includes('viewBox="0 0 16 16"')) {
        finalContent = finalContent.replace("<svg", '<svg viewBox="0 0 16 16"');
      }
      finalContent = finalContent.replace(/\s(width|height)="[^"]+"/g, "");

      const optimized = optimize(finalContent, {
        path: file,
        multipass: true,
        plugins: [
          "preset-default",
          "removeDimensions",
          {
            name: "cleanupNumericValues",
            params: { floatPrecision: 3 },
          },
        ],
      });

      await fs.writeFile(file, optimized.data);
    } catch (err) {
      console.error(`  Error normalizing ${path.basename(file)}:`, err);
    }
  }
  console.log(`  Normalized ${files.length} SVGs`);
}

async function buildSprite() {
  console.log("Building SVG sprite...");
  await fs.ensureDir(PATHS.dist);

  const spriter = new SVGSpriter({
    mode: {
      symbol: {
        dest: ".",
        sprite: "waymark-icons.svg",
      },
    },
  });

  const files = await glob(`${PATHS.svg}/*.svg`);
  for (const file of files) {
    spriter.add(
      path.resolve(file),
      path.basename(file),
      fs.readFileSync(file, { encoding: "utf-8" }),
    );
  }

  const { result } = await spriter.compileAsync();

  for (const mode in result) {
    for (const resource in result[mode]) {
      const fileName = path.basename(result[mode][resource].path);
      const outputPath = path.join(PATHS.dist, fileName);
      await fs.writeFile(outputPath, result[mode][resource].contents);
      console.log(`  Wrote ${outputPath}`);
    }
  }
}

async function updateCodepoints() {
  let codepoints = {};

  if (await fs.pathExists(PATHS.codepoints)) {
    codepoints = await fs.readJson(PATHS.codepoints);
  }

  const files = await glob(`${PATHS.svg}/*.svg`);
  const iconNames = files.map((f) => path.basename(f, ".svg"));

  const maxCode = Object.values(codepoints).reduce(
    (max, code) => Math.max(max, code),
    0xf100,
  );
  let next = maxCode;
  let changed = false;

  for (const name of iconNames.sort()) {
    if (!Object.prototype.hasOwnProperty.call(codepoints, name)) {
      next++;
      codepoints[name] = next;
      changed = true;
      console.log(
        `  Assigned codepoint U+${next.toString(16).toUpperCase()} to '${name}'`,
      );
    }
  }

  if (changed) {
    await fs.writeJson(PATHS.codepoints, codepoints, { spaces: 2 });
    console.log("  Updated codepoints.json");
  }

  return codepoints;
}

// ---------------------------------------------------------------------------
// Fix fill-rule="evenodd" paths for font rendering (non-zero winding rule).
//
// SVG sprites honour fill-rule="evenodd" natively, but icon fonts only support
// the non-zero winding rule. Holes must be encoded as sub-paths winding in the
// opposite direction to their parent. This function rewrites every compound path
// so that outer contours wind CW and hole contours wind CCW, then strips the
// fill-rule attribute.
// ---------------------------------------------------------------------------

function _getSignedArea(pathString) {
  const cmd = new SVGPathCommander(pathString);
  const totalLen = cmd.getTotalLength();
  if (totalLen === 0) return 0;
  const N = 120;
  let area = 0;
  let prev = cmd.getPointAtLength(0);
  for (let i = 1; i <= N; i++) {
    const cur = cmd.getPointAtLength((totalLen * i) / N);
    area += prev.x * cur.y - cur.x * prev.y;
    prev = cur;
  }
  return area / 2;
}

function _samplePath(pathString, N = 80) {
  const cmd = new SVGPathCommander(pathString);
  const len = cmd.getTotalLength();
  return Array.from({ length: N }, (_, i) =>
    cmd.getPointAtLength((len * i) / N),
  );
}

function _pointInPolygon(px, py, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const { x: xi, y: yi } = polygon[i];
    const { x: xj, y: yj } = polygon[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function _fixEvenOddPath(d) {
  // Convert to absolute coordinates first so relative `m` sub-path origins
  // don't lose context when each sub-path is processed independently.
  const absD = new SVGPathCommander(d).toAbsolute().toString();
  const subpaths = absD
    .split(/(?=[M])/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (subpaths.length <= 1) return d;

  const infos = subpaths.map((sp) => {
    const cmd = new SVGPathCommander(sp);
    const len = cmd.getTotalLength();
    return {
      path: sp,
      area: _getSignedArea(sp),
      polygon: _samplePath(sp, 80),
      midPt: cmd.getPointAtLength(len * 0.5),
    };
  });

  // Determine nesting level for each sub-path via point-in-polygon containment.
  // Even level (0, 2, …) → outer / island → wind CW  (positive area in SVG y-down)
  // Odd  level (1, 3, …) → hole           → wind CCW (negative area)
  const levels = infos.map((info, i) =>
    infos.reduce((count, other, j) => {
      if (j === i) return count;
      return (
        count +
        (_pointInPolygon(info.midPt.x, info.midPt.y, other.polygon) ? 1 : 0)
      );
    }, 0),
  );

  return infos
    .map((info, i) => {
      const shouldBeHole = levels[i] % 2 === 1;
      const needsReverse = shouldBeHole ? info.area > 0 : info.area < 0;
      return needsReverse
        ? new SVGPathCommander(info.path).reverse().toString()
        : info.path;
    })
    .join(" ");
}

async function prepareForFont(inputDir, tempDir) {
  console.log("Preparing SVGs for font (fixing evenodd winding)...");
  await fs.ensureDir(tempDir);
  const files = await glob(`${inputDir}/*.svg`);
  let fixed = 0;

  for (const file of files) {
    let content = await fs.readFile(file, "utf8");
    const hasEvenOdd = content.includes('fill-rule="evenodd"');

    if (hasEvenOdd) {
      content = content.replace(/d="([^"]+)"/g, (match, d) => {
        const subs = d.split(/(?=[Mm])/).filter(Boolean);
        if (subs.length <= 1) return match;
        return `d="${_fixEvenOddPath(d)}"`;
      });
      // Remove fill-rule — winding direction now encodes the hole information
      content = content.replace(/\s*fill-rule="evenodd"/g, "");
      fixed++;
    }

    await fs.writeFile(path.join(tempDir, path.basename(file)), content);
  }

  console.log(
    `  Fixed ${fixed} evenodd SVG(s); copied ${files.length} total to ${tempDir}`,
  );
}

async function buildFont(codepoints) {
  const tempDir = path.join(PATHS.dist, ".font-src");
  try {
    await prepareForFont(PATHS.svg, tempDir);
    console.log("Building icon font...");
    await generateFonts({
      inputDir: tempDir,
      outputDir: PATHS.dist,
      name: "waymark-icons",
      fontTypes: [FontAssetType.WOFF2],
      assetTypes: [
        OtherAssetType.CSS,
        OtherAssetType.SCSS,
        OtherAssetType.JSON,
      ],
      prefix: "waymark-icon",
      codepoints,
      normalize: true,
      fontHeight: 300,
    });
    console.log("  Font files written to dist/");
  } finally {
    await fs.remove(tempDir);
  }
}

async function buildVariablesScss(codepoints) {
  const entries = Object.entries(codepoints)
    .map(([name, cp]) => `    "${name}": "\\${cp.toString(16)}"`)
    .join(",\n");

  const content = `// Variables-only file — no @font-face or CSS classes.
// Import this when you only need $waymark-icons-map (e.g. for SCSS map-get usage).
// @use 'src/icons/waymark-icons-variables' as *;
$waymark-icons-map: (\n${entries}\n) !default;\n`;

  const outputPath = path.join(PATHS.dist, "waymark-icons-variables.scss");
  await fs.writeFile(outputPath, content);
  console.log(`  Wrote ${outputPath}`);
}

async function run() {
  await fs.ensureDir(PATHS.dist);
  await processPngs();
  await normalizeSvgs();
  await buildSprite();
  const codepoints = await updateCodepoints();
  await buildFont(codepoints);
  await buildVariablesScss(codepoints);
  console.log("\nBuild complete ✓");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
