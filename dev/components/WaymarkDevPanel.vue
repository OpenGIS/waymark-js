<script setup>
import { useWaymarkInstance } from "../composables/useWaymarkInstance.js";

const props = defineProps({
  mapId: {
    type: String,
    required: true,
  },
  config: {
    type: Object,
    required: true,
  },
  selectId: {
    type: String,
    required: true,
  },
  labelText: {
    type: String,
    required: true,
  },
  windowGlobalKey: {
    type: String,
    required: true,
  },
});

const { uiMode, setMode } = useWaymarkInstance({
  mapId: props.mapId,
  config: props.config,
  windowGlobalKey: props.windowGlobalKey,
});
</script>

<template>
  <div class="waymark-dev-panel">
    <div class="waymark-dev-panel-controls">
      <label :for="selectId">{{ labelText }}: </label>
      <select
        :id="selectId"
        :value="uiMode"
        @change="setMode($event.target.value)"
      >
        <option value="view">view</option>
        <option value="debug">debug</option>
      </select>
    </div>
    <div :id="mapId" class="waymark-dev-panel-map"></div>
  </div>
</template>

<style lang="scss" scoped>
.waymark-dev-panel {
  height: 50vh;
  display: flex;
  flex-direction: column;
}

.waymark-dev-panel-controls {
  padding: 0.25rem 0.5rem;
  background: #f8f9fb;
  flex-shrink: 0;
}

.waymark-dev-panel-map {
  flex: 1;
  min-height: 0;
}
</style>
