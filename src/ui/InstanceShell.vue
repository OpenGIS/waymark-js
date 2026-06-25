<script setup>
import { computed } from "vue";
import InstanceControlButton from "./controls/InstanceControlButton.vue";
import {
  CONTROL_POSITIONS,
  createEmptyControlsByPosition,
} from "./controls/internalControls.js";
import InstanceShellModeDebug from "./modes/InstanceShellModeDebug.vue";
import InstanceShellModeView from "./modes/InstanceShellModeView.vue";

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
  debugOutputVisible: {
    type: Boolean,
    default: true,
  },
});

const modeComponent = computed(() => {
  if (props.mode === "debug") {
    return InstanceShellModeDebug;
  }

  return InstanceShellModeView;
});

const controlsByPosition = computed(
  () => props.controls ?? createEmptyControlsByPosition(),
);

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
        <InstanceControlButton
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

    <component
      :is="modeComponent"
      :key="mode"
      v-bind="{ instanceDocument, waymarkEvents, debugOutputVisible }"
    />
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
