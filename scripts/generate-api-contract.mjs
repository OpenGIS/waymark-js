import fs from "node:fs";
import path from "node:path";
import prettier from "prettier";
import { defaultConfig } from "../src/config/defaults.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUTPUT = path.join(ROOT, "docs", ".generated", "api-contract.json");

const instanceEventsSource = fs.readFileSync(
  path.join(ROOT, "src", "runtime", "createInstanceEvents.js"),
  "utf8",
);

function parseEventConstants(source) {
  const constants = {};
  const regex = /export const\s+([A-Z0-9_]+)\s*=\s*"([^"]+)";/g;
  let match;

  while ((match = regex.exec(source)) !== null) {
    constants[match[1]] = match[2];
  }

  return constants;
}

const constants = parseEventConstants(instanceEventsSource);

const contract = {
  signature: "createInstance({ map, document? })",
  defaults: defaultConfig,
  lifecycleEvents: [
    constants.WAYMARK_INSTANCE_CREATED_EVENT,
    constants.WAYMARK_INSTANCE_DESTROYED_EVENT,
  ],
  dataLayerEvents: [
    constants.WAYMARK_DATA_LAYER_ADDED_EVENT,
    constants.WAYMARK_DATA_LAYER_MOUNTED_EVENT,
    constants.WAYMARK_DATA_LAYER_ERROR_EVENT,
  ],
  featureEvents: [
    constants.WAYMARK_FEATURE_CLICK_EVENT,
    constants.WAYMARK_FEATURE_HOVER_EVENT,
    constants.WAYMARK_FEATURE_LEAVE_EVENT,
  ],
};

const formattedContract = await prettier.format(JSON.stringify(contract), {
  parser: "json",
});

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, formattedContract, "utf8");

console.log(`Written: ${path.relative(ROOT, OUTPUT)}`);
