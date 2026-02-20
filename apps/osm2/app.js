import { createApp, ref, h } from "https://esm.sh/vue@3";
import { createInstance } from "../../library/entry.js";
import { useQueries } from "./composables/useQueries.js";
import { useHighlights } from "./composables/useHighlights.js";
import { useResults } from "./composables/useResults.js";
import HighlightsPanel from "./components/HighlightsPanel.js";

// Shared reactive ref for the MapLibre map instance
const mapRef = ref(null);
const debugMode = ref(false);

// Initialise Waymark and get the MapLibre map
function initMap(center, zoom) {
  createInstance({
    id: "waymark-map",
    mapOptions: { center, zoom },
    onLoad: (instance) => {
      window.waymarkInstance = instance;
      const map = instance.mapLibreStore.mapLibreMap;
      mapRef.value = map;
      console.log("[osm2] Map loaded");

      // Update URL hash on move
      map.on("moveend", () => {
        const c = map.getCenter();
        const z = Math.round(map.getZoom());
        const lat = c.lat.toFixed(4);
        const lon = c.lng.toFixed(4);
        window.history.replaceState(null, "", `#map=${z}/${lat}/${lon}`);
      });

      // Listen for hash changes (e.g. user editing URL)
      window.addEventListener("hashchange", () => {
        const loc = getHashLocation();
        if (loc) {
          map.jumpTo({
            center: loc.center,
            zoom: loc.zoom
          });
        }
      });

      // Debug inspector
      map.on("click", async (e) => {
        if (!debugMode.value) return;
        
        const features = map.queryRenderedFeatures(e.point);
        console.log("Debug Features:", features);
        
        if (features.length === 0) return;

        const content = features.map(f => {
          const props = Object.entries(f.properties)
            .map(([k, v]) => `  ${k}: ${v}`)
            .join("\n");
          return `${f.sourceLayer} (${f.layer.id}):\n${props}\n  id: ${f.id}`;
        }).join("\n\n");

        // Try to decode OSM ID from the first feature with an integer ID
        const featureWithId = features.find(f => Number.isInteger(f.id));
        let osmInfo = "";
        
        if (featureWithId) {
          const fid = featureWithId.id;
          const typeCode = fid % 10;
          const osmId = Math.floor(fid / 10);
          let typeStr = "";
          if (typeCode === 1) typeStr = "node";
          else if (typeCode === 2) typeStr = "way";
          else if (typeCode === 3) typeStr = "relation";

          if (typeStr) {
            osmInfo = `\n\nChecking OSM ${typeStr}/${osmId}...`;
            // We can't actually fetch from OSM API here easily due to CORS/async in alert
            // So just show the ID and link
            osmInfo += `\nOpenStreetMap Link: https://www.openstreetmap.org/${typeStr}/${osmId}`;
          }
        }

        const proceed = confirm(`Features at cursor:\n\n${content}${osmInfo}\n\nOpen OSM link for top feature?`);
        if (proceed && osmInfo) {
             const fid = featureWithId.id;
             const typeCode = fid % 10;
             const osmId = Math.floor(fid / 10);
             let typeStr = "";
             if (typeCode === 1) typeStr = "node";
             else if (typeCode === 2) typeStr = "way";
             else if (typeCode === 3) typeStr = "relation";
             window.open(`https://www.openstreetmap.org/${typeStr}/${osmId}`, "_blank");
        }
      });
    },
  });
}

// Parse initial hash: #map=14/49.6816/-124.9807
function getHashLocation() {
  const hash = window.location.hash;
  if (hash.startsWith("#map=")) {
    // Handle both / and = separators if user accidentally types #map=14/49...
    const cleanHash = hash.replace("#map=", "");
    const parts = cleanHash.split("/").filter(p => p.trim() !== "");
    if (parts.length === 3) {
      const z = parseInt(parts[0], 10);
      const lat = parseFloat(parts[1]);
      const lon = parseFloat(parts[2]);
      if (!isNaN(z) && !isNaN(lat) && !isNaN(lon)) {
        return { center: [lon, lat], zoom: z };
      }
    }
  }
  return null;
}

// Vue app for the highlights panel
const app = createApp({
  setup() {
    const { queries, addQuery, removeQuery, duplicateQuery, updateQuery, setQueries } =
      useQueries();
    const { highlightLayerIds } = useHighlights(mapRef, queries);
    const { resultsByQuery } = useResults(mapRef, queries, highlightLayerIds);

    return () =>
      h(HighlightsPanel, {
        queries: queries.value,
        resultsByQuery: resultsByQuery.value,
        debug: debugMode.value,
        onAddQuery: () => addQuery(),
        onRemoveQuery: (id) => removeQuery(id),
        onDuplicateQuery: (id) => duplicateQuery(id),
        onUpdateQuery: (id, patch) => updateQuery(id, patch),
        onToggleDebug: () => debugMode.value = !debugMode.value,
        onSetQueries: (newQueries) => setQueries(newQueries),
      });
  },
});

app.mount("#highlights-app");

// Geolocate then start map
const startLoc = getHashLocation();

if (startLoc) {
  initMap(startLoc.center, startLoc.zoom);
} else if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (pos) => initMap([pos.coords.longitude, pos.coords.latitude], 14),
    () => initMap([-122.4194, 37.7749], 12),
    { timeout: 5000 },
  );
} else {
  initMap([-122.4194, 37.7749], 12);
}
