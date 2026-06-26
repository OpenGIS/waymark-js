<script setup>
import { computed } from "vue";
import BasemapsRasterList from "./basemaps/BasemapsRasterList.vue";
import BasemapsVectorList from "./basemaps/BasemapsVectorList.vue";

const props = defineProps({
  basemapSnapshot: {
    type: Object,
    default: () => ({
      vector: [],
      raster: [],
    }),
  },
  onSetRasterOpacity: {
    type: Function,
    default: null,
  },
  onReorderRasterBasemaps: {
    type: Function,
    default: null,
  },
  onSetActiveVectorBasemap: {
    type: Function,
    default: null,
  },
});

const vectorBasemaps = computed(() =>
  Array.isArray(props.basemapSnapshot?.vector)
    ? props.basemapSnapshot.vector
    : [],
);
const rasterBasemaps = computed(() =>
  Array.isArray(props.basemapSnapshot?.raster)
    ? props.basemapSnapshot.raster
    : [],
);

/**
 * @param {{ basemapId: string, opacity: number }} payload
 */
const handleSetRasterOpacity = (payload) => {
  props.onSetRasterOpacity?.(payload.basemapId, payload.opacity);
};

/**
 * @param {string[]} orderedBasemapIds
 */
const handleReorderRasterBasemaps = (orderedBasemapIds) => {
  props.onReorderRasterBasemaps?.(orderedBasemapIds);
};

/**
 * @param {string} basemapId
 */
const handleSetActiveVectorBasemap = (basemapId) => {
  props.onSetActiveVectorBasemap?.(basemapId);
};
</script>

<template>
  <section class="waymark-basemaps-panel" data-waymark-basemaps-panel="true">
    <h2>Basemaps</h2>

    <BasemapsRasterList
      :raster-basemaps="rasterBasemaps"
      @set-raster-opacity="handleSetRasterOpacity"
      @reorder-raster-basemaps="handleReorderRasterBasemaps"
    />

    <BasemapsVectorList
      :vector-basemaps="vectorBasemaps"
      @set-active-vector-basemap="handleSetActiveVectorBasemap"
    />
  </section>
</template>

<style scoped>
.waymark-basemaps-panel {
  margin: 0;
  display: grid;
  gap: 0.5rem;
}

h2 {
  margin: 0;
  padding: 0 0 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.4;
}
</style>
