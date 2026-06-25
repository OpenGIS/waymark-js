import fs from "node:fs";
import path from "node:path";
import prettier from "prettier";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUTPUT = path.join(ROOT, "docs", ".generated", "api-contract.json");

const defaultConfig = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, "src", "config", "defaultConfig.json"),
    "utf8",
  ),
);
const instanceEventsSource = fs.readFileSync(
  path.join(ROOT, "src", "core", "createInstanceEvents.js"),
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
  signature: "createInstance(instanceJSON?)",
  defaults: {
    center: defaultConfig.map.options.center,
    zoom: defaultConfig.map.options.zoom,
    style: defaultConfig.map.options.style,
    attributionControl: defaultConfig.map.options.attributionControl,
  },
  lifecycleEvents: [
    constants.WAYMARK_INSTANCE_CREATED_EVENT,
    constants.WAYMARK_INSTANCE_RECREATED_EVENT,
    constants.WAYMARK_INSTANCE_DESTROYED_EVENT,
  ],
  forwardedMapEvents: [
    constants.WAYMARK_MAP_LOAD_EVENT,
    constants.WAYMARK_MAP_MOVEEND_EVENT,
    constants.WAYMARK_MAP_ZOOMEND_EVENT,
    constants.WAYMARK_MAP_ROTATEEND_EVENT,
    constants.WAYMARK_MAP_PITCHEND_EVENT,
  ],
};

const formattedContract = await prettier.format(JSON.stringify(contract), {
  parser: "json",
});

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, formattedContract, "utf8");

console.log(`Written: ${path.relative(ROOT, OUTPUT)}`);
