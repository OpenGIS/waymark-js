<script setup>
import { computed, getCurrentInstance } from "vue";

const props = defineProps({
  vectorBasemaps: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["set-active-vector-basemap"]);
const componentUid = getCurrentInstance()?.uid ?? "vector-list";
const radioGroupName = `waymark-vector-basemap-${componentUid}`;

const entries = computed(() =>
  props.vectorBasemaps.map((vectorBasemap, index) => {
    const basemapId =
      typeof vectorBasemap.basemapId === "string"
        ? vectorBasemap.basemapId
        : `vector-${index}`;
    const fallbackLabel = `Vector basemap ${index + 1}`;

    return {
      id: `waymark-vector-basemap-${basemapId}`,
      basemapId,
      title:
        vectorBasemap.title ||
        (typeof vectorBasemap.styleURL === "string"
          ? vectorBasemap.styleURL
          : null) ||
        fallbackLabel,
      attributionHTML:
        typeof vectorBasemap.attributionHTML === "string"
          ? vectorBasemap.attributionHTML
          : null,
    };
  }),
);

const activeBasemapId = computed(() => entries.value[0]?.basemapId ?? null);

/**
 * @param {string} basemapId
 */
const onSelect = (basemapId) => {
  if (!basemapId) {
    return;
  }

  emit("set-active-vector-basemap", basemapId);
};
</script>

<template>
  <section data-waymark-basemaps-vector-list="true">
    <h3>Vector</h3>
    <ul>
      <li
        v-for="entry in entries"
        :key="entry.id"
        data-waymark-basemaps-vector-item="true"
        class="waymark-basemaps-item"
      >
        <div class="waymark-basemaps-item__meta">
          <p class="waymark-basemaps-item__title">{{ entry.title }}</p>
          <p
            v-if="entry.attributionHTML"
            class="waymark-basemaps-item__attribution"
            v-html="entry.attributionHTML"
          />
        </div>

        <div class="waymark-basemaps-item__control">
          <label :for="entry.id">
            <input
              :id="entry.id"
              type="radio"
              :name="radioGroupName"
              :value="entry.basemapId"
              :checked="entry.basemapId === activeBasemapId"
              :data-waymark-vector-radio="entry.basemapId"
              @change="onSelect(entry.basemapId)"
            />
            Active
          </label>
        </div>
      </li>
      <li v-if="entries.length === 0">No vector basemaps configured.</li>
    </ul>
  </section>
</template>

<style scoped>
h3,
ul {
  margin: 0;
}

h3 {
  font-size: 0.6875rem;
}

ul {
  padding-left: 1rem;
  display: grid;
  gap: 0.25rem;
  font-size: 0.6875rem;
  line-height: 1.4;
}

.waymark-basemaps-item {
  margin: 0;
  padding: 0.25rem;
  border: 1px solid rgb(15 23 42 / 12%);
  border-radius: 0.25rem;
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}

.waymark-basemaps-item__title,
.waymark-basemaps-item__attribution {
  margin: 0;
}

.waymark-basemaps-item__attribution {
  color: rgb(15 23 42 / 70%);
}

.waymark-basemaps-item__control {
  align-self: center;
}
</style>
