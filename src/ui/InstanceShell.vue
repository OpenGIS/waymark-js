<script setup>
import { computed } from "vue";
import Button from "./components/Button.vue";
import {
  CONTROL_POSITIONS,
  PANEL_IDS,
  createEmptyControlsByPosition,
} from "./controls/internalControls.js";
import InstanceShellModal from "./modal/InstanceShellModal.vue";
import InstanceShellModeDebug from "./modes/InstanceShellModeDebug.vue";
import InstanceShellPanelBasemaps from "./panels/InstanceShellPanelBasemaps.vue";

const props = defineProps({
  mode: {
    type: String,
    required: true,
  },
  instanceDocument: {
    type: Object,
    default: null,
  },
  waymarkEvents: {
    type: Array,
    default: () => [],
  },
  controls: {
    type: Object,
    default: () => createEmptyControlsByPosition(),
  },
  activePanel: {
    type: String,
    default: null,
  },
  panelContext: {
    type: Object,
    default: () => ({}),
  },
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

const controlsByPosition = computed(
  () => props.controls ?? createEmptyControlsByPosition(),
);

const modalPanelComponent = computed(() => {
  if (props.activePanel === PANEL_IDS.debugOutput && props.mode === "debug") {
    return InstanceShellModeDebug;
  }

  if (props.activePanel === PANEL_IDS.basemaps) {
    return InstanceShellPanelBasemaps;
  }

  return null;
});

const isModalVisible = computed(() => Boolean(modalPanelComponent.value));

const modalPanelAttributes = computed(() => ({
  "data-waymark-panel": props.activePanel,
  "data-waymark-debug-panel":
    props.activePanel === PANEL_IDS.debugOutput ? "true" : null,
}));

const hasControls = computed(() =>
  CONTROL_POSITIONS.some(
    (position) => (controlsByPosition.value[position] ?? []).length > 0,
  ),
);
</script>

<template>
  <aside class="waymark-instance-shell" aria-live="polite">
    <nav
      v-if="hasControls"
      class="waymark-instance-shell-controls"
      data-waymark-controls="true"
      aria-label="Waymark controls"
    >
      <div
        v-for="position in CONTROL_POSITIONS"
        :key="position"
        class="waymark-instance-shell-controls__position"
        :class="`waymark-instance-shell-controls__position--${position}`"
        :data-waymark-controls-position="position"
      >
        <Button
          v-for="control in controlsByPosition[position] ?? []"
          :key="control.id"
          :data-waymark-control="control.id"
          :title="control.title"
          :icon="control.icon"
          :is-active="Boolean(control.isActive)"
          @click="control.onClick?.()"
        />
      </div>
    </nav>

    <InstanceShellModal :is-visible="isModalVisible">
      <section v-if="modalPanelComponent" v-bind="modalPanelAttributes">
        <component
          :is="modalPanelComponent"
          :key="activePanel"
          v-bind="{
            instanceDocument,
            waymarkEvents,
            panelContext,
            basemapSnapshot,
            onSetRasterOpacity,
            onReorderRasterBasemaps,
            onSetActiveVectorBasemap,
          }"
        />
      </section>
    </InstanceShellModal>
  </aside>
</template>

<style scoped>
.waymark-instance-shell {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.waymark-instance-shell-controls {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

.waymark-instance-shell-controls__position {
  position: absolute;
  display: flex;
  gap: 0.25rem;
}

.waymark-instance-shell-controls__position :deep(button) {
  pointer-events: auto;
}

.waymark-instance-shell-controls__position--top {
  top: 0.5rem;
  left: 50%;
  transform: translateX(-50%);
}

.waymark-instance-shell-controls__position--topRight {
  top: 0.5rem;
  right: 0.5rem;
}

.waymark-instance-shell-controls__position--right {
  top: 50%;
  right: 0.5rem;
  transform: translateY(-50%);
}

.waymark-instance-shell-controls__position--bottomRight {
  right: 0.5rem;
  bottom: 0.5rem;
}

.waymark-instance-shell-controls__position--bottom {
  bottom: 0.5rem;
  left: 50%;
  transform: translateX(-50%);
}

.waymark-instance-shell-controls__position--bottomLeft {
  bottom: 0.5rem;
  left: 0.5rem;
}

.waymark-instance-shell-controls__position--left {
  top: 50%;
  left: 0.5rem;
  transform: translateY(-50%);
}

.waymark-instance-shell-controls__position--topLeft {
  top: 0.5rem;
  left: 0.5rem;
}
</style>
