import { rmSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * SwiftShader reads `SwiftShader.ini` from its working directory (inherited
 * from the Playwright process). Pinning the rasteriser to a single thread is
 * what makes captured bytes reproducible: SwiftShader's parallel rasterisation
 * completes overlapping antialiased fragments in nondeterministic order, so a
 * multi-threaded run can blend the same scene differently between runs.
 */
const INI_FILENAME = "SwiftShader.ini";
const INI_CONTENTS = "[Processor]\nThreadCount=1\n";

function selectedProjectNames(argv) {
  const names = [];

  argv.forEach((value, index) => {
    if (value === "--project") {
      names.push(argv[index + 1]);
    } else if (value.startsWith("--project=")) {
      names.push(value.slice("--project=".length));
    }
  });

  return names;
}

/**
 * Whether this invocation renders the screenshots project.
 *
 * The pin applies whenever the screenshots project runs: a bare `playwright
 * test` executes every project (screenshots included), and both
 * `--project screenshots` and `--project=screenshots` select it explicitly. A
 * `--project=functional` run never touches the pin.
 *
 * @param {string[]} [argv]
 * @returns {boolean}
 */
export function shouldPinSwiftShader(argv = process.argv.slice(2)) {
  const projects = selectedProjectNames(argv);

  return projects.length === 0 || projects.includes("screenshots");
}

/**
 * @param {string} [cwd]
 * @returns {string}
 */
export function swiftShaderIniPath(cwd = process.cwd()) {
  return path.join(cwd, INI_FILENAME);
}

export function writeSwiftShaderPin() {
  writeFileSync(swiftShaderIniPath(), INI_CONTENTS);
}

export function removeSwiftShaderPin() {
  rmSync(swiftShaderIniPath(), { force: true });
}
