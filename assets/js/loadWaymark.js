/**
 * Loads Waymark with the given GeoJSON data.
 * The parameter can be either a URL string or a direct object.
 *
 * @param {string} divId - ID of the div to load Waymark into
 * @param {string|object} geojsonInput - GeoJSON object or URL to fetch it from
 */
export async function loadWaymark(divId, geojsonInput) {
  try {
    // Helper to resolve input to data
    const resolveInput = async (input) => {
      if (typeof input === "string") {
        const res = await fetch(input);
        if (!res.ok)
          throw new Error(`Failed to fetch ${input}: ${res.statusText}`);
        return await res.json();
      }
      return input;
    };

    const geojson = await resolveInput(geojsonInput);

    // Mode detection
    const isDev =
      typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.DEV;

    if (isDev) {
      // Development mode - use ES modules
      // Import relative to this file: ../../library/entry.js
      const { Instance } = await import("../../library/entry.js");
      const instance = new Instance(divId, geojson);
      return instance;
    } else {
      // Add production assets
      // These paths are relative to the document (index.html)
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "./dist/waymark-js.css";
      document.head.appendChild(link);

      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "./dist/waymark-js.umd.cjs";
        script.onload = () => {
          try {
            // Use the global WaymarkJS variable
            const instance = new WaymarkJS.Instance(divId, geojson);
            resolve(instance);
          } catch (err) {
            reject(err);
          }
        };
        script.onerror = () =>
          reject(new Error("Failed to load Waymark script"));
        document.body.appendChild(script);
      });
    }
  } catch (e) {
    console.error("Error loading Waymark:", e);
  }
}
