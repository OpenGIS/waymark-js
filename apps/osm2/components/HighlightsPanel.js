import { h, defineComponent, ref } from "https://esm.sh/vue@3";
import QueryCard from "./QueryCard.js";

export default defineComponent({
  name: "HighlightsPanel",
  props: {
    queries: { type: Array, required: true },
    resultsByQuery: { type: Object, default: () => ({}) },
    debug: { type: Boolean, default: false },
  },
  emits: ["addQuery", "removeQuery", "duplicateQuery", "updateQuery", "toggleDebug", "setQueries"],
  setup(props, { emit }) {
    const fileInput = ref(null);
    const showWelcome = ref(true);

    const handleImportClick = () => {
      fileInput.value.click();
    };

    const handleFileChange = (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target.result);
          if (Array.isArray(json)) {
            emit("setQueries", json);
          } else {
            alert("Invalid file format: Expected a JSON array.");
          }
        } catch (err) {
          console.error("Import failed", err);
          alert("Failed to parse JSON file.");
        }
        // Reset input so same file can be selected again
        event.target.value = "";
      };
      reader.readAsText(file);
    };

    const handleExport = () => {
      const dataStr = JSON.stringify(props.queries, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `osm-queries-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    const handleClear = () => {
      if (confirm("Are you sure you want to clear all queries?")) {
        emit("setQueries", []);
      }
    };

    return () =>
      h("div", { class: "highlights-panel" }, [
        // Hidden file input for import
        h("input", {
          type: "file",
          ref: fileInput,
          style: { display: "none" },
          accept: ".json",
          onChange: handleFileChange,
        }),

        // Header
        h("div", { class: "panel-header" }, [
          h("h3", "OSM Highlights"),
          h("div", { class: "header-actions" }, [
            h("button", {
              class: "btn btn-icon btn-sm",
              title: "Clear All Queries",
              onClick: handleClear,
            }, "🗑️"),
            h("button", {
              class: "btn btn-icon btn-sm",
              title: "Import JSON",
              onClick: handleImportClick,
            }, "📂"),
            h("button", {
              class: "btn btn-icon btn-sm",
              title: "Export JSON",
              onClick: handleExport,
            }, "💾"),
            h("button", {
              class: "btn btn-icon btn-sm",
              title: "Inspect Features",
              onClick: () => emit("toggleDebug"),
              style: props.debug ? "background: #ffecb3;" : ""
            }, "🐞"),
            h("button", {
              class: "btn btn-primary btn-sm",
              onClick: () => emit("addQuery"),
            }, "+ Query"),
          ]),
        ]),

        // Welcome Message (Collapsible)
        showWelcome.value
          ? h("div", { class: "welcome-message" }, [
              h("div", { class: "welcome-header" }, [
                h("strong", "About OSM Highlights"),
                h("button", {
                  class: "btn-close",
                  title: "Dismiss",
                  onClick: () => (showWelcome.value = false),
                }, "×"),
              ]),
              h("p", [
                "Explore ",
                h("a", { href: "https://www.openstreetmap.org", target: "_blank", style: "color: #2563eb; text-decoration: none;" }, "OpenStreetMap"),
                " data using dynamic style queries. Vector tiles powered by ",
                h("a", { href: "https://openfreemap.org", target: "_blank", style: "color: #2563eb; text-decoration: none;" }, "OpenFreeMap"),
                ".",
              ]),
              h("p", { style: "font-size: 0.9em; opacity: 0.8; margin-top: 4px;" },
                "Highlight features by tag, class, or type to create custom thematic maps."
              ),
            ])
          : null,

        // Body
        h("div", { class: "panel-body" },
          props.queries.length === 0
            ? [h("div", { class: "empty-state" }, 'No queries yet. Click "+ Query" to start.')]
            : props.queries.map((q) =>
                h(QueryCard, {
                  key: q.id,
                  query: q,
                  results: props.resultsByQuery[q.id] || [],
                  onUpdate: (patch) => emit("updateQuery", q.id, patch),
                  onRemove: () => emit("removeQuery", q.id),
                  onDuplicate: () => emit("duplicateQuery", q.id),
                }),
              ),
        ),
      ]);
  },
});
