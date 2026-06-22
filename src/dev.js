import { createInstance } from "./entry.js";

const waymarkInstance = createInstance("map", {
  map: {
    options: {
      center: [-128.0094, 50.6539],
      zoom: 15,
      style: "https://tiles.openfreemap.org/styles/bright",
    },
  },
});

// Expose for browser tests and debugging
window.createWaymarkInstance = createInstance;
window.waymarkInstance = waymarkInstance;
