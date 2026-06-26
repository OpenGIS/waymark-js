<script setup>
const props = defineProps({
  basemap: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits([
  "drag-start",
  "drag-over",
  "drop",
  "drag-end",
  "set-opacity",
]);

const onDragStart = () => {
  emit("drag-start", props.basemap.basemapId);
};

/**
 * @param {DragEvent} event
 */
const onDragOver = (event) => {
  emit("drag-over", event);
};

/**
 * @param {DragEvent} event
 */
const onDrop = (event) => {
  emit("drop", {
    event,
    targetBasemapId: props.basemap.basemapId,
  });
};

const onDragEnd = () => {
  emit("drag-end");
};

/**
 * @param {Event} event
 */
const onOpacityInput = (event) => {
  const opacity = Number(event.target?.value);

  if (Number.isNaN(opacity)) {
    return;
  }

  emit("set-opacity", {
    basemapId: props.basemap.basemapId,
    opacity,
  });
};
</script>

<template>
  <li
    :data-waymark-raster-item="basemap.basemapId"
    draggable="true"
    @dragstart="onDragStart"
    @dragover="onDragOver"
    @drop="onDrop"
    @dragend="onDragEnd"
  >
    <div>{{ basemap.title || basemap.basemapId }}</div>
    <label>
      Opacity
      <input
        :data-waymark-raster-opacity-input="basemap.basemapId"
        type="range"
        min="0"
        max="1"
        step="0.05"
        :value="basemap.opacity ?? 1"
        @input="onOpacityInput"
      />
    </label>
  </li>
</template>

<style scoped>
li {
  margin: 0;
  padding: 0.25rem;
  border: 1px solid rgb(15 23 42 / 12%);
  border-radius: 0.25rem;
}

label {
  display: grid;
  gap: 0.125rem;
}
</style>
