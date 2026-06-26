<script setup>
import { ref } from "vue";
import BasemapsRasterItem from "./BasemapsRasterItem.vue";

const props = defineProps({
  rasterBasemaps: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["set-raster-opacity", "reorder-raster-basemaps"]);

const draggedBasemapId = ref(null);

/**
 * @param {string} basemapId
 */
const onDragStart = (basemapId) => {
  draggedBasemapId.value = basemapId;
};

/**
 * @param {DragEvent} event
 */
const onDragOver = (event) => {
  event.preventDefault();
};

/**
 * @param {{ event: DragEvent, targetBasemapId: string }} payload
 */
const onDrop = (payload) => {
  payload.event.preventDefault();

  const sourceBasemapId = draggedBasemapId.value;
  const targetBasemapId = payload.targetBasemapId;

  if (!sourceBasemapId || sourceBasemapId === targetBasemapId) {
    draggedBasemapId.value = null;
    return;
  }

  const orderedBasemapIds = props.rasterBasemaps.map(
    (rasterBasemap) => rasterBasemap.basemapId,
  );
  const sourceIndex = orderedBasemapIds.indexOf(sourceBasemapId);
  const targetIndex = orderedBasemapIds.indexOf(targetBasemapId);

  if (sourceIndex < 0 || targetIndex < 0) {
    draggedBasemapId.value = null;
    return;
  }

  const [movedBasemapId] = orderedBasemapIds.splice(sourceIndex, 1);
  orderedBasemapIds.splice(targetIndex, 0, movedBasemapId);

  emit("reorder-raster-basemaps", orderedBasemapIds);
  draggedBasemapId.value = null;
};

const onDragEnd = () => {
  draggedBasemapId.value = null;
};

/**
 * @param {{ basemapId: string, opacity: number }} payload
 */
const onSetOpacity = (payload) => {
  emit("set-raster-opacity", payload);
};
</script>

<template>
  <section data-waymark-basemaps-raster-list="true">
    <h3>Raster</h3>
    <ul>
      <BasemapsRasterItem
        v-for="basemap in rasterBasemaps"
        :key="basemap.basemapId"
        :basemap="basemap"
        @drag-start="onDragStart"
        @drag-over="onDragOver"
        @drop="onDrop"
        @drag-end="onDragEnd"
        @set-opacity="onSetOpacity"
      />
      <li v-if="rasterBasemaps.length === 0">No raster basemaps configured.</li>
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
  margin: 0;
  padding-left: 1rem;
  display: grid;
  gap: 0.25rem;
  font-size: 0.6875rem;
  line-height: 1.4;
}
</style>
