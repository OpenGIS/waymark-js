import { Map, setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-csp-worker?url";

import "maplibre-gl/dist/maplibre-gl.css";
import "./style.scss";

setWorkerUrl(workerUrl);

const map = new Map({
    container: "map", // container id
    style: "https://demotiles.maplibre.org/globe.json", // style URL
    center: [0, 0], // starting position [lng, lat]
    zoom: 1, // starting zoom
});
