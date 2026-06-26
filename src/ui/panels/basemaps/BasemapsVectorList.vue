<script setup>
import { computed } from "vue";

const props = defineProps({
  vectorBasemaps: {
    type: Array,
    default: () => [],
  },
});

const entries = computed(() =>
  props.vectorBasemaps.map((vectorBasemap, index) => {
    const fallbackLabel = `Vector basemap ${index + 1}`;
    return {
      id: `vector-${index}`,
      label:
        vectorBasemap.title ||
        (typeof vectorBasemap.styleURL === "string"
          ? vectorBasemap.styleURL
          : null) ||
        fallbackLabel,
    };
  }),
);
</script>

<template>
  <section data-waymark-basemaps-vector-list="true">
    <h3>Vector</h3>
    <ul>
      <li
        v-for="entry in entries"
        :key="entry.id"
        data-waymark-basemaps-vector-item="true"
      >
        {{ entry.label }}
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
  font-size: 0.6875rem;
  line-height: 1.4;
}
</style>
