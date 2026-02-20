import { ref, watch } from "https://esm.sh/vue@3";

export function useResults(mapRef, queries, highlightLayerIds) {
  // Map<queryId, Feature[]>
  const resultsByQuery = ref({});

  function refreshResults() {
    const map = mapRef.value;
    if (!map) return;

    const newResults = {};

    for (const query of queries.value) {
      if (!query.enabled) {
        newResults[query.id] = [];
        continue;
      }

      // Find highlight layers belonging to this query
      const qLayerIds = highlightLayerIds.value.filter((id) =>
        id.includes(query.id),
      );

      // Filter to layers that actually exist on the map
      const existingIds = qLayerIds.filter((id) => map.getLayer(id));
      if (existingIds.length === 0) {
        newResults[query.id] = [];
        continue;
      }

      // Query all visible features on these layers
      let features;
      try {
        features = map.queryRenderedFeatures({ layers: existingIds });
      } catch (e) {
        // Layer may not be ready yet
        features = [];
      }

      // Post-filter for regex conditions (MapLibre can't do regex natively)
      const regexConditions = query.conditions.filter(
        (c) => c.operator === "regex" && c.key && c.value,
      );
      if (regexConditions.length > 0) {
        features = features.filter((f) => {
          return regexConditions.every((cond) => {
            const propVal = String(f.properties?.[cond.key] ?? "");
            try {
              return new RegExp(cond.value, "i").test(propVal);
            } catch {
              return false;
            }
          });
        });
      }

      // Deduplicate by a composite key (source layer + feature id or properties hash)
      const seen = new Set();
      const deduped = [];
      for (const f of features) {
        const fid = f.id
          || JSON.stringify(f.geometry?.coordinates?.slice(0, 2));
        const key = `${f.sourceLayer}-${fid}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(f);
        }
      }

      newResults[query.id] = deduped;
    }

    resultsByQuery.value = newResults;
  }

  // Refresh when map or layer IDs change
  watch(highlightLayerIds, () => {
    // Small delay to let MapLibre render new layers
    setTimeout(refreshResults, 100);
  });

  // Bind map events when map becomes available
  watch(mapRef, (map, oldMap) => {
    if (oldMap) {
      oldMap.off("moveend", refreshResults);
      oldMap.off("zoomend", refreshResults);
    }
    if (map) {
      map.on("moveend", refreshResults);
      map.on("zoomend", refreshResults);
      // Initial results
      setTimeout(refreshResults, 500);
    }
  });

  return { resultsByQuery, refreshResults };
}
