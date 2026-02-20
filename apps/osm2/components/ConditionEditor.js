import { h, defineComponent } from "https://esm.sh/vue@3";

const OPERATORS = ["equals", "not-equals", "contains", "regex", "exists"];

export default defineComponent({
  name: "ConditionEditor",
  props: {
    conditions: { type: Array, required: true },
  },
  emits: ["update:conditions"],
  setup(props, { emit }) {
    function update(index, field, value) {
      const copy = props.conditions.map((c) => ({ ...c }));
      copy[index][field] = value;
      emit("update:conditions", copy);
    }

    function addCondition() {
      emit("update:conditions", [
        ...props.conditions,
        { key: "", operator: "equals", value: "" },
      ]);
    }

    function removeCondition(index) {
      const copy = [...props.conditions];
      copy.splice(index, 1);
      emit("update:conditions", copy.length ? copy : [{ key: "", operator: "equals", value: "" }]);
    }

    return () =>
      h("div", [
        h("div", {
          style: { fontWeight: "600", fontSize: "11px", marginBottom: "4px" },
        }, "Conditions"),
        ...props.conditions.map((cond, i) =>
          h("div", { class: "condition-row", key: i }, [
            h("input", {
              type: "text",
              class: "condition-key",
              placeholder: "key",
              value: cond.key,
              onInput: (e) => update(i, "key", e.target.value),
            }),
            h("select", {
              class: "condition-op",
              value: cond.operator,
              onChange: (e) => update(i, "operator", e.target.value),
            },
              OPERATORS.map((op) =>
                h("option", { value: op, key: op }, op),
              ),
            ),
            cond.operator !== "exists"
              ? h("input", {
                  type: "text",
                  placeholder: "value",
                  value: cond.value,
                  onInput: (e) => update(i, "value", e.target.value),
                })
              : null,
            h("button", {
              class: "btn btn-sm btn-danger",
              onClick: () => removeCondition(i),
              title: "Remove condition",
            }, "×"),
          ]),
        ),
        h("button", {
          class: "btn btn-sm",
          style: { marginTop: "4px" },
          onClick: addCondition,
        }, "+ Condition"),
      ]);
  },
});
