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
    class="waymark-basemaps-item"
    draggable="true"
    @dragstart="onDragStart"
    @dragover="onDragOver"
    @drop="onDrop"
    @dragend="onDragEnd"
  >
    <div class="waymark-basemaps-item__meta">
      <p class="waymark-basemaps-item__title">
        {{ basemap.title || basemap.basemapId }}
      </p>
      <p
        v-if="basemap.attributionHTML"
        class="waymark-basemaps-item__attribution"
        v-html="basemap.attributionHTML"
      />
    </div>

    <div class="waymark-basemaps-item__control">
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
    </div>
  </li>
</template>

<style scoped>
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

.waymark-basemaps-item__control label {
  display: grid;
  gap: 0.125rem;
}
</style>
