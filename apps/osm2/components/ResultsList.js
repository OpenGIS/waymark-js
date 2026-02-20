import { h, defineComponent, computed } from "https://esm.sh/vue@3";

export default defineComponent({
  name: "ResultsList",
  props: {
    results: { type: Array, default: () => [] },
    colour: { type: String, default: "#999" },
  },
  setup(props) {
    const count = computed(() => props.results.length);

    function osmLink(feature) {
      // OpenMapTiles encodes: feature.id = osm_id * 10 + type (1=node, 2=way, 3=relation)
      const fid = feature.id;
      if (!fid) return null;

      const typeCode = fid % 10;
      const osmId = Math.floor(fid / 10);
      const osmType = typeCode === 1 ? "node" : typeCode === 2 ? "way" : typeCode === 3 ? "relation" : null;
      if (!osmType || osmId <= 0) return null;

      return `https://www.openstreetmap.org/${osmType}/${osmId}`;
    }

    function featureLabel(feature) {
      const p = feature.properties || {};
      return p.name || p.name_en || p.class || p.subclass || `Feature ${feature.id || ""}`;
    }

    return () => {
      if (count.value === 0) {
        return h("div", { class: "results-section" }, [
          h("div", { class: "results-count" }, "No matches in view"),
        ]);
      }

      return h("div", { class: "results-section" }, [
        h("div", { class: "results-count" }, [
          h("strong", {
            style: { color: props.colour },
          }, count.value),
          ` feature${count.value !== 1 ? "s" : ""} in view`,
        ]),
        h("div", { class: "results-list" },
          props.results.slice(0, 100).map((f, i) => {
            const link = osmLink(f);
            return h("div", { class: "result-item", key: i }, [
              h("span", featureLabel(f)),
              link
                ? h("a", { href: link, target: "_blank", title: "View on OSM" }, "OSM ↗")
                : null,
            ]);
          }),
        ),
        count.value > 100
          ? h("div", {
              style: { fontSize: "10px", color: "#999", marginTop: "4px" },
            }, `…and ${count.value - 100} more`)
          : null,
      ]);
    };
  },
});
