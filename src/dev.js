import { createInstance } from "./entry.js";

const waymarkInstance = createInstance("map", {
  map: {
    options: {
      center: [-128.0094, 50.6539],
      zoom: 15,
    },
    basemaps: [
      {
        name: "OpenStreetMap",
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
      {
        name: "OpenFreeMap Bright",
        type: "vector",
        style: "https://tiles.openfreemap.org/styles/bright",
      },
    ],
  },
});

// Expose for browser tests and debugging
window.createWaymarkInstance = createInstance;
window.waymarkInstance = waymarkInstance;
