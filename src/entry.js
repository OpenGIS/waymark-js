import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-csp-worker?url";

setWorkerUrl(workerUrl);

export { createInstance } from "./api/createInstance.js";
