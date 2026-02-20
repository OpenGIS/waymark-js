import { h, defineComponent, ref } from "https://esm.sh/vue@3";
import ConditionEditor from "./ConditionEditor.js";
import ResultsList from "./ResultsList.js";

const SOURCE_LAYERS = [
  "transportation", "poi", "building", "landuse", "landcover", "water",
  "water_name", "waterway", "aeroway", "aerodrome_label", "boundary",
  "place", "park", "transportation_name",
];

export default defineComponent({
  name: "QueryCard",
  props: {
    query: { type: Object, required: true },
    results: { type: Array, default: () => [] },
  },
  emits: ["update", "remove", "duplicate"],
  setup(props, { emit }) {
    const expanded = ref(false);
    const editingName = ref(false);

    function patch(field, value) {
      emit("update", { [field]: value });
    }

    return () => {
      const q = props.query;

      return h("div", {
        class: ["query-card", { disabled: !q.enabled }],
      }, [
        // Header
        h("div", { class: "query-header" }, [
          h("input", {
            type: "color",
            value: q.colour,
            title: "Change colour",
            onInput: (e) => patch("colour", e.target.value),
            onClick: (e) => e.stopPropagation(),
          }),
          editingName.value
            ? h("input", {
                class: "query-name-input",
                value: q.name,
                onInput: (e) => patch("name", e.target.value),
                onBlur: () => { editingName.value = false; },
                onKeydown: (e) => { if (e.key === "Enter") editingName.value = false; },
                onClick: (e) => e.stopPropagation(),
                ref: (el) => { if (el) el.focus(); },
              })
            : h("span", {
                class: "query-name",
                onDblclick: () => { editingName.value = true; },
                onClick: () => { expanded.value = !expanded.value; },
              }, q.name),
          h("label", { class: "toggle-switch", onClick: (e) => e.stopPropagation() }, [
            h("input", {
              type: "checkbox",
              checked: q.enabled,
              onChange: (e) => patch("enabled", e.target.checked),
            }),
            h("span", { class: "toggle-slider" }),
          ]),
          h("button", {
            class: "btn btn-sm btn-icon",
            onClick: (e) => { e.stopPropagation(); expanded.value = !expanded.value; },
            title: expanded.value ? "Collapse" : "Expand",
          }, expanded.value ? "▲" : "▼"),
        ]),

        // Body (expanded)
        expanded.value
          ? h("div", { class: "query-body" }, [
              // Settings row
              h("div", { class: "query-settings" }, [
                h("label", [
                  "Layer: ",
                  h("select", {
                    value: q.sourceLayer,
                    onChange: (e) => patch("sourceLayer", e.target.value),
                  },
                    SOURCE_LAYERS.map((l) =>
                      h("option", { value: l, key: l }, l),
                    ),
                  ),
                ]),
                h("label", [
                  "Logic: ",
                  h("select", {
                    value: q.combinator,
                    onChange: (e) => patch("combinator", e.target.value),
                  }, [
                    h("option", { value: "AND" }, "AND"),
                    h("option", { value: "OR" }, "OR"),
                  ]),
                ]),
                h("label", [
                  "Icon: ",
                  h("input", {
                    type: "text",
                    style: { width: "40px", textAlign: "center", fontSize: "14px" },
                    value: q.icon || "",
                    placeholder: "●",
                    title: "Emoji icon for POI markers (leave empty for circle)",
                    onInput: (e) => patch("icon", e.target.value || null),
                  }),
                ]),
              ]),
              
              // Line styling (for line layers)
              h("div", { class: "query-line-style" }, [
                h("label", [
                  "Line Width: ",
                  h("input", {
                    type: "number",
                    min: "0.5",
                    max: "10",
                    step: "0.5",
                    value: q.lineWidth ?? 3,
                    title: "Width of line in pixels",
                    onInput: (e) => patch("lineWidth", parseFloat(e.target.value) || 3),
                    style: { width: "50px" },
                  }),
                ]),
                h("label", [
                  "Dash Pattern: ",
                  h("input", {
                    type: "text",
                    placeholder: "e.g. 2,2",
                    value: q.lineDash ? q.lineDash.join(",") : "",
                    title: "Comma-separated values for dash array (e.g. '2,2' for dashed)",
                    onInput: (e) => {
                      const val = e.target.value.trim();
                      const newDash = val
                        ? val.split(",").map(s => parseFloat(s.trim())).filter(n => !isNaN(n))
                        : null;
                      patch("lineDash", newDash && newDash.length > 0 ? newDash : null);
                    },
                    style: { width: "100px" },
                  }),
                ]),
              ]),

              // Conditions
              h(ConditionEditor, {
                conditions: q.conditions,
                "onUpdate:conditions": (val) => patch("conditions", val),
              }),

              // Actions
              h("div", {
                style: { display: "flex", gap: "6px", marginTop: "8px" },
              }, [
                h("button", {
                  class: "btn btn-sm",
                  onClick: () => emit("duplicate"),
                }, "Duplicate"),
                h("button", {
                  class: "btn btn-sm btn-danger",
                  onClick: () => emit("remove"),
                }, "Delete"),
              ]),

              // Results
              h(ResultsList, {
                results: props.results,
                colour: q.colour,
              }),
            ])
          : null,
      ]);
    };
  },
});
