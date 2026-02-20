import { ref, watch } from "https://esm.sh/vue@3";

const STORAGE_KEY = "osm2-highlight-queries";
const STORAGE_VERSION_KEY = "osm2-queries-version";
const CURRENT_VERSION = 8; // Increment this to invalidate old stored queries

const SOURCE_LAYERS = [
  "transportation",
  "poi",
  "building",
  "landuse",
  "landcover",
  "water",
  "water_name",
  "waterway",
  "aeroway",
  "aerodrome_label",
  "boundary",
  "place",
  "park",
  "transportation_name",
];

const OPERATORS = ["equals", "not-equals", "contains", "regex", "exists", "in-list"];

const PALETTE = [
  "#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6",
  "#1abc9c", "#e67e22", "#e84393", "#00b894", "#6c5ce7",
  "#fd79a8", "#0984e3", "#ffeaa7", "#d63031", "#00cec9",
];

let colourIndex = Math.floor(Math.random() * PALETTE.length);
function nextColour() {
  const c = PALETTE[colourIndex % PALETTE.length];
  colourIndex++;
  return c;
}

function generateId() {
  return "q_" + Math.random().toString(36).substring(2, 10);
}

function createBlankQuery(overrides = {}) {
  return {
    id: generateId(),
    name: "New Query",
    enabled: true,
    colour: nextColour(),
    sourceLayer: "transportation",
    combinator: "AND",
    icon: null,
    lineWidth: 3,
    lineDash: null,
    conditions: [{ key: "", operator: "equals", value: "" }],
    ...overrides,
  };
}

function defaultQueries() {
  return [
    // 1. Trails (Foot & Cycle) - Red Dotted Line
    {
      id: generateId(),
      name: "Trails (Foot & Cycle)",
      enabled: true,
      colour: "#d63031", // Red
      lineWidth: 3,
      lineDash: [2, 2], // Dotted
      sourceLayer: "transportation",
      combinator: "AND",
      icon: null,
      conditions: [
        { 
          key: "class", 
          operator: "in-list", 
          value: "path,track" 
        },
        // Exclude common urban infrastructure
        { key: "subclass", operator: "not-equals", value: "sidewalk" },
        { key: "subclass", operator: "not-equals", value: "crossing" },
        { key: "subclass", operator: "not-equals", value: "platform" },
        { key: "subclass", operator: "not-equals", value: "corridor" },
        // Exclude cycleway=lane (painted lanes) if they appear as paths? Usually they are on roads.
      ],
    },
    // 2. Trailheads
    {
      id: generateId(),
      name: "Trailheads",
      enabled: true,
      colour: "#2ecc71", // Green
      lineWidth: 0,
      lineDash: null,
      sourceLayer: "poi",
      combinator: "AND",
      icon: "🥾",
      conditions: [
        { key: "subclass", operator: "equals", value: "trailhead" },
      ],
    },
    // 3. Parking
    {
      id: generateId(),
      name: "Parking",
      enabled: true,
      colour: "#3498db", // Blue
      lineWidth: 0,
      lineDash: null,
      sourceLayer: "poi",
      combinator: "AND",
      icon: "🅿️",
      conditions: [
        { key: "subclass", operator: "equals", value: "parking" },
      ],
    },
    // 4. Campsites
    {
      id: generateId(),
      name: "Campsites",
      enabled: true,
      colour: "#e67e22", // Orange
      lineWidth: 0,
      lineDash: null,
      sourceLayer: "poi",
      combinator: "AND",
      icon: "⛺",
      conditions: [
        { key: "subclass", operator: "equals", value: "campsite" },
      ],
    },
    // 5. Boat Launches / Slipways
    {
      id: generateId(),
      name: "Boat Launches",
      enabled: true,
      colour: "#0984e3", // Dark Blue
      lineWidth: 0,
      lineDash: null,
      sourceLayer: "poi",
      combinator: "AND",
      icon: "🚤",
      conditions: [
        { key: "subclass", operator: "in-list", value: "slipway,boat_ramp" },
      ],
    },
    // 6. Viewpoints
    {
      id: generateId(),
      name: "Viewpoints",
      enabled: true,
      colour: "#9b59b6", // Purple
      lineWidth: 0,
      lineDash: null,
      sourceLayer: "poi",
      combinator: "AND",
      icon: "🔭",
      conditions: [
        { key: "subclass", operator: "equals", value: "viewpoint" },
      ],
    },
    // 7. Mountain Peaks
    {
      id: generateId(),
      name: "Peaks",
      enabled: true,
      colour: "#636e72", // Grey
      lineWidth: 0,
      lineDash: null,
      sourceLayer: "poi", // Sometimes in 'mountain_peak' layer too, but POI often has them
      combinator: "AND",
      icon: "⛰️",
      conditions: [
        { key: "subclass", operator: "equals", value: "peak" },
      ],
    },
    // 8. Picnic Areas
    {
      id: generateId(),
      name: "Picnic Areas",
      enabled: true,
      colour: "#00b894", // Teal
      lineWidth: 0,
      lineDash: null,
      sourceLayer: "poi",
      combinator: "AND",
      icon: "🧺",
      conditions: [
        { key: "subclass", operator: "equals", value: "picnic_site" },
      ],
    },
    // 9. Cabins / Alpine Huts
    {
      id: generateId(),
      name: "Cabins / Huts",
      enabled: true,
      colour: "#e17055", // Terra Cotta
      lineWidth: 0,
      lineDash: null,
      sourceLayer: "poi",
      combinator: "OR",
      icon: "🏠",
      conditions: [
        { key: "subclass", operator: "equals", value: "alpine_hut" },
        { key: "subclass", operator: "equals", value: "wilderness_hut" },
      ],
    },
    // 10. Food & Drink
    {
      id: generateId(),
      name: "Food & Drink",
      enabled: true,
      colour: "#fdcb6e", // Yellow-Orange
      lineWidth: 0,
      lineDash: null,
      sourceLayer: "poi",
      combinator: "OR",
      icon: "🍽",
      conditions: [
        { key: "subclass", operator: "equals", value: "cafe" },
        { key: "subclass", operator: "equals", value: "restaurant" },
        { key: "subclass", operator: "equals", value: "fast_food" },
        { key: "subclass", operator: "equals", value: "coffee" },
        { key: "class", operator: "equals", value: "beer" },
      ],
    },
    // 11. Shops (Convenience/Grocery)
    {
      id: generateId(),
      name: "Shops",
      enabled: true,
      colour: "#8e44ad", // Purple
      lineWidth: 0,
      lineDash: null,
      sourceLayer: "poi",
      combinator: "OR",
      icon: "🛒",
      conditions: [
        { key: "subclass", operator: "equals", value: "convenience" },
        { key: "subclass", operator: "equals", value: "supermarket" },
        { key: "subclass", operator: "equals", value: "grocery" },
      ],
    },
    // 12. Waterfalls
    {
      id: generateId(),
      name: "Waterfalls",
      enabled: true,
      colour: "#74b9ff", // Light Blue
      lineWidth: 0,
      lineDash: null,
      sourceLayer: "poi", // Often 'attraction' or specific class
      combinator: "AND",
      icon: "🌊",
      conditions: [
        { key: "subclass", operator: "equals", value: "waterfall" },
      ],
    },
    // 13. Tourism Information
    {
      id: generateId(),
      name: "Information",
      enabled: true,
      colour: "#6c5ce7", // Purple-Blue
      lineWidth: 0,
      lineDash: null,
      sourceLayer: "poi",
      combinator: "AND",
      icon: "ℹ️",
      conditions: [
        { key: "subclass", operator: "equals", value: "information" },
      ],
    },
  ];
}

function loadFromStorage() {
  try {
    const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
    const raw = localStorage.getItem(STORAGE_KEY);
    
    // If version mismatch or no stored version, clear old data and use defaults
    if (storedVersion !== String(CURRENT_VERSION)) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_VERSION_KEY, String(CURRENT_VERSION));
      return defaultQueries();
    }
    
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch (e) {
    console.warn("[osm2] Failed to load queries from localStorage:", e);
  }
  return defaultQueries();
}

function saveToStorage(queries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queries));
  } catch (e) {
    console.warn("[osm2] Failed to save queries to localStorage:", e);
  }
}

export function useQueries() {
  const queries = ref(loadFromStorage());

  // Persist on any change
  watch(queries, (val) => saveToStorage(val), { deep: true });

  function addQuery(overrides) {
    queries.value.push(createBlankQuery(overrides));
  }

  function removeQuery(id) {
    queries.value = queries.value.filter((q) => q.id !== id);
  }

  function duplicateQuery(id) {
    const source = queries.value.find((q) => q.id === id);
    if (!source) return;
    const clone = {
      ...JSON.parse(JSON.stringify(source)),
      id: generateId(),
      name: source.name + " (copy)",
      colour: nextColour(),
    };
    queries.value.push(clone);
  }

  function updateQuery(id, patch) {
    const q = queries.value.find((q) => q.id === id);
    if (q) Object.assign(q, patch);
  }

  function setQueries(newQueries) {
    queries.value = newQueries;
  }

  return {
    queries,
    addQuery,
    removeQuery,
    duplicateQuery,
    updateQuery,
    setQueries,
    SOURCE_LAYERS,
    OPERATORS,
  };
}
