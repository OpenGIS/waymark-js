import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

/**
 * Reproducibility gate for the committed screenshots.
 *
 * Regenerates all captures into a throwaway directory, then compares that set
 * against `screenshots/` by exact file set and SHA-256 per file. This is the
 * check the macOS identity workflow runs against the baseline machine's bytes;
 * a mismatch means the capture pipeline no longer reproduces the committed set.
 */
const ROOT = path.resolve(import.meta.dirname, "..");
const COMMITTED_DIR = path.join(ROOT, "screenshots");
const VERIFY_DIR = path.join(ROOT, "test-results", "screenshots-verify");
const REPORT_PATH = path.join(VERIFY_DIR, "report.json");

/** @param {string} dir @returns {string[]} */
function listPngs(dir) {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".png"))
    .sort();
}

/** @param {string} filePath @returns {string} */
function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

/** @param {Record<string, unknown>} report */
function writeReport(report) {
  mkdirSync(VERIFY_DIR, { recursive: true });
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
}

function fail(message, report) {
  console.error(`\nscreenshots:verify failed:\n`);
  if (message) {
    console.error(message);
  }
  if (report) {
    for (const file of report.files) {
      if (file.status === "match") {
        continue;
      }
      if (file.status === "mismatch") {
        console.error(`  ${file.name}`);
        console.error(`    expected ${file.expected}`);
        console.error(`    actual   ${file.actual}`);
      } else if (file.status === "missing") {
        console.error(`  ${file.name}: missing from generated output`);
      } else {
        console.error(`  ${file.name}: unexpected extra file`);
      }
    }
    console.error(`\nReport: ${path.relative(ROOT, REPORT_PATH)}`);
  }
  console.error(
    `\nGenerated captures kept in ${path.relative(ROOT, VERIFY_DIR)}/`,
  );
  process.exit(1);
}

// Start from a clean throwaway directory so a stale capture can never pass.
rmSync(VERIFY_DIR, { recursive: true, force: true });
mkdirSync(VERIFY_DIR, { recursive: true });

console.log(
  `Generating screenshots into ${path.relative(ROOT, VERIFY_DIR)}/ ...`,
);

const run = spawnSync("npx", ["playwright", "test", "--project=screenshots"], {
  cwd: ROOT,
  stdio: "inherit",
  env: { ...process.env, SCREENSHOT_OUT_DIR: VERIFY_DIR },
});

if (run.error) {
  fail(`Failed to launch Playwright: ${run.error.message}`);
}

if (run.status !== 0) {
  writeReport({
    ok: false,
    runFailed: true,
    exitCode: run.status,
    generatedDir: path.relative(ROOT, VERIFY_DIR),
  });
  fail(`The screenshots run exited with code ${run.status}.`);
}

const expectedNames = listPngs(COMMITTED_DIR);
const actualNames = listPngs(VERIFY_DIR);
const names = [...new Set([...expectedNames, ...actualNames])].sort();

const files = names.map((name) => {
  const inCommitted = expectedNames.includes(name);
  const inGenerated = actualNames.includes(name);
  const expected = inCommitted ? sha256(path.join(COMMITTED_DIR, name)) : null;
  const actual = inGenerated ? sha256(path.join(VERIFY_DIR, name)) : null;

  let status = "match";
  if (inCommitted && !inGenerated) {
    status = "missing";
  } else if (!inCommitted && inGenerated) {
    status = "extra";
  } else if (expected !== actual) {
    status = "mismatch";
  }

  return { name, status, expected, actual };
});

const matches = files.filter((file) => file.status === "match").length;
const ok = files.length > 0 && files.every((file) => file.status === "match");

writeReport({
  ok,
  generatedAt: new Date().toISOString(),
  expectedDir: path.relative(ROOT, COMMITTED_DIR),
  generatedDir: path.relative(ROOT, VERIFY_DIR),
  matched: matches,
  total: expectedNames.length,
  files,
});

if (!ok) {
  fail(null, { files });
}

console.log(
  `\nVerified ${matches}/${expectedNames.length} screenshots byte-identical.`,
);
